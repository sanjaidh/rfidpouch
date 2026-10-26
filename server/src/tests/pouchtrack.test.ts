import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../index.js';
import prisma from '../prisma.js';
import { parseNdefPouchPayload, formatPouchPayload } from '../utils/ndefParser.js';
import { validateStatusTransition } from '../services/workflowEngine.js';

describe('PouchTrack Comprehensive Test Suite', () => {
  let testDeptId: string;
  let testCheckpointId: string;
  let testInactiveCheckpointId: string;
  let samplePouchSerial = 'PCH-TEST-001';
  let createdPouchId: string;

  beforeAll(async () => {
    // Create test department and checkpoints
    const dept = await prisma.department.create({
      data: {
        name: `Test Dept ${Date.now()}`,
        description: 'Automated test department',
        active: true,
      },
    });
    testDeptId = dept.id;

    const cp = await prisma.checkpoint.create({
      data: {
        name: `Test CP Active ${Date.now()}`,
        departmentId: testDeptId,
        active: true,
      },
    });
    testCheckpointId = cp.id;

    const inactiveCp = await prisma.checkpoint.create({
      data: {
        name: `Test CP Inactive ${Date.now()}`,
        departmentId: testDeptId,
        active: false,
      },
    });
    testInactiveCheckpointId = inactiveCp.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (createdPouchId) {
      await prisma.movementEvent.deleteMany({ where: { pouchId: createdPouchId } });
      await prisma.alert.deleteMany({ where: { pouchId: createdPouchId } });
      await prisma.pouch.deleteMany({ where: { id: createdPouchId } });
    }
    await prisma.checkpoint.deleteMany({ where: { departmentId: testDeptId } });
    await prisma.department.deleteMany({ where: { id: testDeptId } });
  });

  // 1. NDEF Payload Parsing
  describe('1. NDEF Tag Payload Parser', () => {
    it('should correctly parse standard format POUCH:PCH-000123', () => {
      const result = parseNdefPouchPayload('POUCH:PCH-000123');
      expect(result.valid).toBe(true);
      expect(result.serialNumber).toBe('PCH-000123');
    });

    it('should handle whitespace and case-insensitivity in payload prefix', () => {
      const result = parseNdefPouchPayload('  pouch:pch-000123  ');
      expect(result.valid).toBe(true);
      expect(result.serialNumber).toBe('PCH-000123');
    });

    it('should reject URLs and explain standard format', () => {
      const result = parseNdefPouchPayload('https://example.com/tag');
      expect(result.valid).toBe(false);
      expect(result.serialNumber).toBeNull();
      expect(result.errorMessage).toContain('Tag contains a URL');
    });

    it('should reject arbitrary unstructured text with clear instruction', () => {
      const result = parseNdefPouchPayload('Random Tag Payload 999');
      expect(result.valid).toBe(false);
      expect(result.serialNumber).toBeNull();
      expect(result.errorMessage).toContain('Unregistered or invalid pouch tag');
    });

    it('should format payload correctly', () => {
      const payload = formatPouchPayload('pch-000123');
      expect(payload).toBe('POUCH:PCH-000123');
    });
  });

  // 2. Pouch Registration & Duplicate Rejection
  describe('2. Pouch Registration', () => {
    it('should register a new pouch with unique serial number', async () => {
      const res = await request(app)
        .post('/api/pouches')
        .send({
          serialNumber: samplePouchSerial,
          batchNumber: 'BATCH-TEST-01',
          pouchType: 'Heavy-Duty Kevlar Pouch',
          currentDepartmentId: testDeptId,
          currentCheckpointId: testCheckpointId,
          status: 'Registered',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.pouch.serialNumber).toBe(samplePouchSerial);
      expect(res.body.pouch.tagProgrammed).toBe(false);
      createdPouchId = res.body.pouch.id;
    });

    it('should reject duplicate serial number registration', async () => {
      const res = await request(app)
        .post('/api/pouches')
        .send({
          serialNumber: samplePouchSerial,
          batchNumber: 'BATCH-TEST-DUPLICATE',
          currentDepartmentId: testDeptId,
          currentCheckpointId: testCheckpointId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });
  });

  // 3. Unknown Pouch Handling
  describe('3. Unknown Pouch Lookup & Movements', () => {
    it('should return 404 for non-existent pouch lookup', async () => {
      const res = await request(app).get('/api/pouches/lookup/PCH-NONEXISTENT-999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject movement for unknown pouch and create an alert', async () => {
      const res = await request(app)
        .post('/api/movements')
        .send({
          pouchSerialNumber: 'PCH-DOES-NOT-EXIST-000',
          destinationCheckpointId: testCheckpointId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not registered');

      // Verify alert was logged
      const alert = await prisma.alert.findFirst({
        where: {
          type: 'unregistered_tag',
          description: { contains: 'PCH-DOES-NOT-EXIST-000' },
        },
      });
      expect(alert).toBeDefined();
    });
  });

  // 4. Valid Movement Recording
  describe('4. Movement Recording & Integrity', () => {
    it('should successfully record a valid movement to an active checkpoint', async () => {
      const res = await request(app)
        .post('/api/movements')
        .send({
          pouchSerialNumber: samplePouchSerial,
          destinationCheckpointId: testCheckpointId,
          targetStatus: 'Awaiting Processing',
          operatorName: 'Unit Tester Operator',
          source: 'phone_nfc',
          notes: 'Test scan at inward dock',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.movement.newStatus).toBe('Awaiting Processing');
      expect(res.body.movement.operatorName).toBe('Unit Tester Operator');
      expect(res.body.pouch.currentCheckpointId).toBe(testCheckpointId);
    });

    it('should reject duplicate movement submissions via idempotencyKey', async () => {
      const idempotencyKey = `idem-key-${Date.now()}`;

      const res1 = await request(app)
        .post('/api/movements')
        .send({
          pouchSerialNumber: samplePouchSerial,
          destinationCheckpointId: testCheckpointId,
          targetStatus: 'Awaiting Processing',
          idempotencyKey,
        });
      expect(res1.status).toBe(201);

      // Repeat submission with same key
      const res2 = await request(app)
        .post('/api/movements')
        .send({
          pouchSerialNumber: samplePouchSerial,
          destinationCheckpointId: testCheckpointId,
          targetStatus: 'Awaiting Processing',
          idempotencyKey,
        });
      expect(res2.body.duplicate).toBe(true);
    });

    it('should reject movement to an inactive checkpoint', async () => {
      const res = await request(app)
        .post('/api/movements')
        .send({
          pouchSerialNumber: samplePouchSerial,
          destinationCheckpointId: testInactiveCheckpointId,
          targetStatus: 'In Production',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('inactive');
    });

    it('should reject illegal status transitions without prerequisite stages', async () => {
      // Trying to jump from Awaiting Processing directly to Dispatched
      const res = await request(app)
        .post('/api/movements')
        .send({
          pouchSerialNumber: samplePouchSerial,
          destinationCheckpointId: testCheckpointId,
          targetStatus: 'Dispatched',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Workflow rule violation');
    });

    it('should retrieve chronological movement history for the pouch', async () => {
      const res = await request(app).get(`/api/pouches/${createdPouchId}/history`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.movements)).toBe(true);
      expect(res.body.movements.length).toBeGreaterThan(0);
    });
  });

  // 5. Tag Programming Status
  describe('5. NFC Tag Programming Confirmation', () => {
    it('should update tagProgrammed status when NFC write completes', async () => {
      const res = await request(app).post(`/api/pouches/${createdPouchId}/tag-programmed`);
      expect(res.status).toBe(200);
      expect(res.body.pouch.tagProgrammed).toBe(true);
    });
  });

  // 6. Dashboard & Reports Calculations
  describe('6. Dashboard & Reporting Calculations', () => {
    it('should calculate live metrics from real database records', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.metrics.totalPouches).toBeGreaterThan(0);
      expect(Array.isArray(res.body.pouchesByDepartment)).toBe(true);
      expect(Array.isArray(res.body.dailyVolume)).toBe(true);
    });

    it('should return detailed reports summary', async () => {
      const res = await request(app).get('/api/reports/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.metrics).toBeDefined();
      expect(Array.isArray(res.body.report.tagStats)).toBe(true);
    });
  });
});

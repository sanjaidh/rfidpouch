import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { recordPouchMovement } from '../services/movementService.js';
import type { Server as SocketIOServer } from 'socket.io';

export function createMovementsRouter(io?: SocketIOServer) {
  const router = Router();

  const recordMovementSchema = z.object({
    pouchSerialNumber: z.string().optional(),
    pouchId: z.string().optional(),
    destinationCheckpointId: z.string().min(1, 'Destination checkpoint ID is required'),
    targetStatus: z.string().optional(),
    operatorName: z.string().optional(),
    source: z.enum(['phone_nfc', 'manual_entry', 'simulator', 'admin_correction']).default('phone_nfc'),
    notes: z.string().optional(),
    idempotencyKey: z.string().optional(),
    bypassWorkflowRules: z.boolean().optional(),
  });

  // POST /api/movements - Record new checkpoint movement
  router.post('/', async (req: Request, res: Response) => {
    try {
      const parsed = recordMovementSchema.parse(req.body);

      if (!parsed.pouchSerialNumber && !parsed.pouchId) {
        return res.status(400).json({
          success: false,
          error: 'Either pouchSerialNumber or pouchId must be provided.',
        });
      }

      const result = await recordPouchMovement(parsed, io);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to record movement',
      });
    }
  });

  // GET /api/movements - List movements with comprehensive filters & CSV export
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        pouchSerialNumber,
        batchNumber,
        departmentId,
        checkpointId,
        operatorName,
        source,
        result,
        startDate,
        endDate,
        format,
        limit = '100',
        offset = '0',
      } = req.query;

      const where: any = {};

      if (pouchSerialNumber) {
        where.pouchSerialNumber = { contains: String(pouchSerialNumber).trim().toUpperCase() };
      }

      if (batchNumber) {
        where.pouch = { batchNumber: { contains: String(batchNumber).trim() } };
      }

      if (departmentId && departmentId !== 'all') {
        where.newDepartmentId = String(departmentId);
      }

      if (checkpointId && checkpointId !== 'all') {
        where.newCheckpointId = String(checkpointId);
      }

      if (operatorName) {
        where.operatorName = { contains: String(operatorName).trim() };
      }

      if (source && source !== 'all') {
        where.source = String(source);
      }

      if (result && result !== 'all') {
        where.result = String(result);
      }

      if (startDate || endDate) {
        where.occurredAt = {};
        if (startDate) {
          where.occurredAt.gte = new Date(String(startDate));
        }
        if (endDate) {
          const end = new Date(String(endDate));
          end.setHours(23, 59, 59, 999);
          where.occurredAt.lte = end;
        }
      }

      // If CSV export requested
      if (format === 'csv') {
        const allMovements = await prisma.movementEvent.findMany({
          where,
          include: {
            previousDepartment: true,
            previousCheckpoint: true,
            newDepartment: true,
            newCheckpoint: true,
          },
          orderBy: { occurredAt: 'desc' },
        });

        const headers = [
          'Event ID',
          'Pouch Serial Number',
          'Previous Department',
          'Previous Checkpoint',
          'New Department',
          'New Checkpoint',
          'Previous Status',
          'New Status',
          'Operator Name',
          'Scan Source',
          'Result',
          'Occurred At (UTC)',
          'Notes',
        ];

        const rows = allMovements.map((m) => [
          m.id,
          m.pouchSerialNumber,
          m.previousDepartment?.name || 'N/A',
          m.previousCheckpoint?.name || 'N/A',
          m.newDepartment.name,
          m.newCheckpoint.name,
          m.previousStatus || 'N/A',
          m.newStatus,
          m.operatorName || 'N/A',
          m.source,
          m.result,
          m.occurredAt.toISOString(),
          `"${(m.notes || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="pouchtrack-movements.csv"');
        return res.send(csvContent);
      }

      const [total, movements] = await Promise.all([
        prisma.movementEvent.count({ where }),
        prisma.movementEvent.findMany({
          where,
          include: {
            pouch: {
              select: {
                id: true,
                serialNumber: true,
                batchNumber: true,
                pouchType: true,
              },
            },
            previousDepartment: true,
            previousCheckpoint: true,
            newDepartment: true,
            newCheckpoint: true,
          },
          orderBy: { occurredAt: 'desc' },
          take: parseInt(String(limit), 10),
          skip: parseInt(String(offset), 10),
        }),
      ]);

      res.json({ success: true, total, movements });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

export default createMovementsRouter;

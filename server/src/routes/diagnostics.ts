import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';
import { parseNdefPouchPayload } from '../utils/ndefParser.js';

const router = Router();

// GET /api/diagnostics
router.get('/', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const [pouchCount, deptCount, checkpointCount, movementCount, alertCount] = await Promise.all([
      prisma.pouch.count(),
      prisma.department.count(),
      prisma.checkpoint.count(),
      prisma.movementEvent.count(),
      prisma.alert.count(),
    ]);
    const dbLatencyMs = Date.now() - startTime;

    res.json({
      success: true,
      diagnostics: {
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        database: {
          connected: true,
          latencyMs: dbLatencyMs,
          counts: {
            pouches: pouchCount,
            departments: deptCount,
            checkpoints: checkpointCount,
            movements: movementCount,
            alerts: alertCount,
          },
        },
        supportedNdefFormat: 'POUCH:<SERIAL_NUMBER>',
        examplePayload: 'POUCH:PCH-000123',
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      database: { connected: false },
    });
  }
});

// POST /api/diagnostics/test-scan - Test payload parser
router.post('/test-scan', (req: Request, res: Response) => {
  const { rawText, recordType } = req.body;
  const result = parseNdefPouchPayload(rawText, recordType || 'text');
  res.json({ success: true, result });
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';

const router = Router();

const updateAlertSchema = z.object({
  resolutionStatus: z.enum(['open', 'in_review', 'resolved', 'dismissed']),
  resolutionNotes: z.string().optional(),
});

// GET /api/alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, severity, type, limit = '100', offset = '0' } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.resolutionStatus = String(status);
    }

    if (severity && severity !== 'all') {
      where.severity = String(severity);
    }

    if (type && type !== 'all') {
      where.type = String(type);
    }

    const [total, alerts] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        where,
        include: {
          pouch: {
            select: {
              id: true,
              serialNumber: true,
              batchNumber: true,
              status: true,
            },
          },
          checkpoint: {
            select: {
              id: true,
              name: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
    ]);

    res.json({ success: true, total, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts - Create alert (e.g. from frontend scan error or hardware failure)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, severity = 'medium', pouchId, checkpointId, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({ success: false, error: 'Type and description are required.' });
    }

    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        pouchId: pouchId || null,
        checkpointId: checkpointId || null,
        description,
        resolutionStatus: 'open',
      },
      include: {
        pouch: true,
        checkpoint: true,
      },
    });

    res.status(201).json({ success: true, alert });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/alerts/:id - Resolve or dismiss alert
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateAlertSchema.parse(req.body);

    const isResolved = parsed.resolutionStatus === 'resolved' || parsed.resolutionStatus === 'dismissed';

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        resolutionStatus: parsed.resolutionStatus,
        resolutionNotes: parsed.resolutionNotes,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        pouch: true,
        checkpoint: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'resolve_alert',
        entityType: 'alert',
        entityId: alert.id,
        details: JSON.stringify({
          status: parsed.resolutionStatus,
          notes: parsed.resolutionNotes,
        }),
      },
    });

    res.json({ success: true, alert });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

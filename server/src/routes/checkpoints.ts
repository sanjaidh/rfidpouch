import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';

const router = Router();

const createCheckpointSchema = z.object({
  name: z.string().min(2, 'Checkpoint name must be at least 2 characters').trim(),
  departmentId: z.string().min(1, 'Department ID is required'),
  description: z.string().optional(),
});

// GET /api/checkpoints
router.get('/', async (req: Request, res: Response) => {
  try {
    const { departmentId, all } = req.query;
    const includeInactive = all === 'true';

    const checkpoints = await prisma.checkpoint.findMany({
      where: {
        ...(departmentId ? { departmentId: String(departmentId) } : {}),
        ...(includeInactive ? {} : { active: true }),
      },
      include: {
        department: true,
        _count: {
          select: {
            currentPouches: { where: { active: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, checkpoints });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/checkpoints
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createCheckpointSchema.parse(req.body);

    // Verify department exists
    const dept = await prisma.department.findUnique({
      where: { id: parsed.departmentId },
    });

    if (!dept) {
      return res.status(404).json({
        success: false,
        error: `Department '${parsed.departmentId}' not found.`,
      });
    }

    const checkpoint = await prisma.checkpoint.create({
      data: {
        name: parsed.name,
        departmentId: parsed.departmentId,
        description: parsed.description,
      },
      include: { department: true },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'create',
        entityType: 'checkpoint',
        entityId: checkpoint.id,
        details: JSON.stringify(checkpoint),
      },
    });

    res.status(201).json({ success: true, checkpoint });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/checkpoints/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, departmentId, description, active } = req.body;

    const checkpoint = await prisma.checkpoint.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
      include: { department: true },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'update',
        entityType: 'checkpoint',
        entityId: checkpoint.id,
        details: JSON.stringify(req.body),
      },
    });

    res.json({ success: true, checkpoint });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

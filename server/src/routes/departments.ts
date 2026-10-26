import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';

const router = Router();

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').trim(),
  description: z.string().optional(),
});

// GET /api/departments
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === 'true';
    const departments = await prisma.department.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        checkpoints: {
          where: includeInactive ? {} : { active: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            currentPouches: { where: { active: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, departments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/departments
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createDepartmentSchema.parse(req.body);

    const existing = await prisma.department.findUnique({
      where: { name: parsed.name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Department '${parsed.name}' already exists.`,
      });
    }

    const department = await prisma.department.create({
      data: {
        name: parsed.name,
        description: parsed.description,
      },
      include: { checkpoints: true },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'create',
        entityType: 'department',
        entityId: department.id,
        details: JSON.stringify(department),
      },
    });

    res.status(201).json({ success: true, department });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/departments/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
      include: { checkpoints: true },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'update',
        entityType: 'department',
        entityId: department.id,
        details: JSON.stringify(req.body),
      },
    });

    res.json({ success: true, department });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

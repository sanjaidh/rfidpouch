import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';

const router = Router();

const createPouchSchema = z.object({
  serialNumber: z.string().optional(),
  batchNumber: z.string().min(1, 'Batch number is required').trim(),
  pouchType: z.string().default('Standard Industrial Pouch'),
  currentDepartmentId: z.string().min(1, 'Initial department is required'),
  currentCheckpointId: z.string().min(1, 'Initial checkpoint is required'),
  status: z.string().default('Registered'),
  description: z.string().optional(),
});

// Helper to generate next auto serial number: PCH-000123
async function generateNextSerialNumber(): Promise<string> {
  const count = await prisma.pouch.count();
  let candidateNumber = count + 1;
  let candidateSerial = `PCH-${String(candidateNumber).padStart(6, '0')}`;

  while (await prisma.pouch.findUnique({ where: { serialNumber: candidateSerial } })) {
    candidateNumber++;
    candidateSerial = `PCH-${String(candidateNumber).padStart(6, '0')}`;
  }

  return candidateSerial;
}

// GET /api/pouches/generate-serial
router.get('/generate-serial', async (_req: Request, res: Response) => {
  try {
    const serial = await generateNextSerialNumber();
    res.json({ success: true, serialNumber: serial });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pouches/lookup/:identifier
router.get('/lookup/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier.trim().toUpperCase();

    const pouch = await prisma.pouch.findFirst({
      where: {
        OR: [
          { serialNumber: identifier },
          { id: identifier },
        ],
      },
      include: {
        currentDepartment: true,
        currentCheckpoint: true,
        movements: {
          orderBy: { occurredAt: 'desc' },
          take: 5,
          include: {
            newDepartment: true,
            newCheckpoint: true,
          },
        },
      },
    });

    if (!pouch) {
      return res.status(404).json({
        success: false,
        error: `Pouch with identifier '${identifier}' was not found.`,
      });
    }

    res.json({ success: true, pouch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pouches
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      departmentId,
      status,
      tagProgrammed,
      active,
      limit = '100',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (active !== undefined && active !== 'all') {
      where.active = active === 'true';
    }

    if (departmentId && departmentId !== 'all') {
      where.currentDepartmentId = String(departmentId);
    }

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (tagProgrammed !== undefined && tagProgrammed !== 'all') {
      where.tagProgrammed = tagProgrammed === 'true';
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { serialNumber: { contains: q } },
        { batchNumber: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const [total, pouches] = await Promise.all([
      prisma.pouch.count({ where }),
      prisma.pouch.findMany({
        where,
        include: {
          currentDepartment: true,
          currentCheckpoint: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
    ]);

    res.json({ success: true, total, pouches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pouches
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createPouchSchema.parse(req.body);

    const serialNumber = parsed.serialNumber?.trim()
      ? parsed.serialNumber.trim().toUpperCase()
      : await generateNextSerialNumber();

    // Verify serial number uniqueness
    const existing = await prisma.pouch.findUnique({
      where: { serialNumber },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Pouch with serial number '${serialNumber}' already exists.`,
      });
    }

    // Verify department and checkpoint
    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: parsed.currentCheckpointId },
      include: { department: true },
    });

    if (!checkpoint) {
      return res.status(400).json({
        success: false,
        error: `Invalid checkpoint specified.`,
      });
    }

    const pouch = await prisma.pouch.create({
      data: {
        serialNumber,
        batchNumber: parsed.batchNumber,
        pouchType: parsed.pouchType,
        currentDepartmentId: checkpoint.departmentId,
        currentCheckpointId: checkpoint.id,
        status: parsed.status,
        description: parsed.description,
        tagProgrammed: false,
        active: true,
      },
      include: {
        currentDepartment: true,
        currentCheckpoint: true,
      },
    });

    // Create initial audit event
    await prisma.auditEvent.create({
      data: {
        action: 'create',
        entityType: 'pouch',
        entityId: pouch.id,
        details: JSON.stringify({
          serialNumber: pouch.serialNumber,
          batchNumber: pouch.batchNumber,
          department: checkpoint.department.name,
          checkpoint: checkpoint.name,
          status: pouch.status,
        }),
      },
    });

    res.status(201).json({ success: true, pouch });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/pouches/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pouch = await prisma.pouch.findFirst({
      where: {
        OR: [{ id }, { serialNumber: id.toUpperCase() }],
      },
      include: {
        currentDepartment: true,
        currentCheckpoint: true,
        movements: {
          orderBy: { occurredAt: 'desc' },
          include: {
            previousDepartment: true,
            previousCheckpoint: true,
            newDepartment: true,
            newCheckpoint: true,
          },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pouch) {
      return res.status(404).json({ success: false, error: 'Pouch not found.' });
    }

    res.json({ success: true, pouch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/pouches/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { batchNumber, pouchType, description, active, status } = req.body;

    const pouch = await prisma.pouch.update({
      where: { id },
      data: {
        ...(batchNumber ? { batchNumber: batchNumber.trim() } : {}),
        ...(pouchType ? { pouchType } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        currentDepartment: true,
        currentCheckpoint: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'update',
        entityType: 'pouch',
        entityId: pouch.id,
        details: JSON.stringify(req.body),
      },
    });

    res.json({ success: true, pouch });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/pouches/:id/history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const movements = await prisma.movementEvent.findMany({
      where: {
        OR: [{ pouchId: id }, { pouchSerialNumber: id.toUpperCase() }],
      },
      include: {
        previousDepartment: true,
        previousCheckpoint: true,
        newDepartment: true,
        newCheckpoint: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    res.json({ success: true, movements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pouches/:id/tag-programmed
router.post('/:id/tag-programmed', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pouch = await prisma.pouch.update({
      where: { id },
      data: { tagProgrammed: true },
      include: {
        currentDepartment: true,
        currentCheckpoint: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'tag_programmed',
        entityType: 'pouch',
        entityId: pouch.id,
        details: JSON.stringify({
          serialNumber: pouch.serialNumber,
          tagProgrammed: true,
          programmedAt: new Date().toISOString(),
        }),
      },
    });

    res.json({ success: true, pouch });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

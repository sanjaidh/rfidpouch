import prisma from '../prisma.js';
import { validateStatusTransition, inferStatusForDepartment } from './workflowEngine.js';
import type { Server as SocketIOServer } from 'socket.io';

export interface RecordMovementParams {
  pouchSerialNumber?: string;
  pouchId?: string;
  destinationCheckpointId: string;
  targetStatus?: string;
  operatorName?: string;
  source?: 'phone_nfc' | 'manual_entry' | 'simulator' | 'admin_correction';
  notes?: string;
  idempotencyKey?: string;
  occurredAt?: Date;
  bypassWorkflowRules?: boolean;
}

export async function recordPouchMovement(
  params: RecordMovementParams,
  io?: SocketIOServer
) {
  const {
    pouchSerialNumber,
    pouchId,
    destinationCheckpointId,
    targetStatus: explicitStatus,
    operatorName = 'Factory Operator',
    source = 'phone_nfc',
    notes,
    idempotencyKey,
    occurredAt = new Date(),
    bypassWorkflowRules = false,
  } = params;

  // 1. Check idempotency key if provided to prevent duplicate submissions
  if (idempotencyKey) {
    const existingMovement = await prisma.movementEvent.findUnique({
      where: { idempotencyKey },
      include: {
        pouch: true,
        newDepartment: true,
        newCheckpoint: true,
      },
    });

    if (existingMovement) {
      return {
        success: true,
        duplicate: true,
        message: 'Movement already recorded (idempotent request).',
        movement: existingMovement,
        pouch: existingMovement.pouch,
      };
    }
  }

  // 2. Lookup pouch by ID or Serial Number
  const pouch = await prisma.pouch.findFirst({
    where: pouchId
      ? { id: pouchId }
      : { serialNumber: pouchSerialNumber?.trim().toUpperCase() },
    include: {
      currentDepartment: true,
      currentCheckpoint: true,
      movements: {
        orderBy: { occurredAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!pouch) {
    // Record alert for unregistered or unknown tag
    await prisma.alert.create({
      data: {
        type: 'unregistered_tag',
        severity: 'high',
        description: `Scan attempt for non-existent pouch serial '${pouchSerialNumber || pouchId}'.`,
        resolutionStatus: 'open',
      },
    });

    throw new Error(
      `Pouch '${pouchSerialNumber || pouchId}' is not registered in the system.`
    );
  }

  // 3. Check if pouch is active
  if (!pouch.active) {
    await prisma.alert.create({
      data: {
        type: 'inactive_pouch',
        severity: 'medium',
        pouchId: pouch.id,
        description: `Movement rejected: Pouch ${pouch.serialNumber} is currently marked inactive or decommissioned.`,
      },
    });

    throw new Error(
      `Pouch ${pouch.serialNumber} is deactivated. Reactivate the pouch before recording movements.`
    );
  }

  // 4. Validate destination checkpoint
  const destinationCheckpoint = await prisma.checkpoint.findUnique({
    where: { id: destinationCheckpointId },
    include: { department: true },
  });

  if (!destinationCheckpoint) {
    throw new Error(`Destination checkpoint '${destinationCheckpointId}' does not exist.`);
  }

  if (!destinationCheckpoint.active) {
    await prisma.alert.create({
      data: {
        type: 'inactive_checkpoint',
        severity: 'medium',
        pouchId: pouch.id,
        checkpointId: destinationCheckpoint.id,
        description: `Movement rejected: Target checkpoint '${destinationCheckpoint.name}' is inactive.`,
      },
    });

    throw new Error(
      `Destination checkpoint '${destinationCheckpoint.name}' is currently inactive.`
    );
  }

  // 5. Determine target status
  const targetStatus =
    explicitStatus ||
    inferStatusForDepartment(destinationCheckpoint.department.name, pouch.status);

  // 6. Workflow transition rules check
  if (!bypassWorkflowRules) {
    const hasQualityPassed = pouch.movements.some(
      (m) =>
        m.newStatus === 'Quality Inspection' ||
        m.previousStatus === 'Quality Inspection'
    );
    const hasPackaged = pouch.movements.some(
      (m) => m.newStatus === 'Packaging' || m.previousStatus === 'Packaging'
    );

    const validation = validateStatusTransition(
      pouch.status,
      targetStatus,
      destinationCheckpoint.department.name,
      { hasQualityPassed, hasPackaged }
    );

    if (!validation.valid) {
      // Record rejected movement attempt
      await prisma.movementEvent.create({
        data: {
          pouchId: pouch.id,
          pouchSerialNumber: pouch.serialNumber,
          previousDepartmentId: pouch.currentDepartmentId,
          previousCheckpointId: pouch.currentCheckpointId,
          newDepartmentId: destinationCheckpoint.departmentId,
          newCheckpointId: destinationCheckpoint.id,
          previousStatus: pouch.status,
          newStatus: targetStatus,
          operatorName,
          source,
          result: 'rejected',
          notes: validation.message,
          occurredAt,
        },
      });

      // Create alert for unexpected transition
      await prisma.alert.create({
        data: {
          type: 'unexpected_transition',
          severity: 'high',
          pouchId: pouch.id,
          checkpointId: destinationCheckpoint.id,
          description: validation.message || 'Invalid status transition attempt.',
        },
      });

      throw new Error(validation.message);
    }
  }

  // 7. Atomic transaction: update Pouch and create MovementEvent & AuditEvent
  const result = await prisma.$transaction(async (tx) => {
    const updatedPouch = await tx.pouch.update({
      where: { id: pouch.id },
      data: {
        currentDepartmentId: destinationCheckpoint.departmentId,
        currentCheckpointId: destinationCheckpoint.id,
        status: targetStatus,
        lastScannedAt: occurredAt,
      },
      include: {
        currentDepartment: true,
        currentCheckpoint: true,
      },
    });

    const movement = await tx.movementEvent.create({
      data: {
        pouchId: pouch.id,
        pouchSerialNumber: pouch.serialNumber,
        previousDepartmentId: pouch.currentDepartmentId,
        previousCheckpointId: pouch.currentCheckpointId,
        newDepartmentId: destinationCheckpoint.departmentId,
        newCheckpointId: destinationCheckpoint.id,
        previousStatus: pouch.status,
        newStatus: targetStatus,
        operatorName,
        source,
        result: 'success',
        notes: notes || null,
        idempotencyKey: idempotencyKey || null,
        occurredAt,
      },
      include: {
        previousDepartment: true,
        previousCheckpoint: true,
        newDepartment: true,
        newCheckpoint: true,
      },
    });

    await tx.auditEvent.create({
      data: {
        action: 'movement',
        entityType: 'pouch',
        entityId: pouch.id,
        details: JSON.stringify({
          movementId: movement.id,
          fromDept: pouch.currentDepartment.name,
          toDept: destinationCheckpoint.department.name,
          fromCheckpoint: pouch.currentCheckpoint.name,
          toCheckpoint: destinationCheckpoint.name,
          fromStatus: pouch.status,
          toStatus: targetStatus,
          operator: operatorName,
          source,
        }),
      },
    });

    return { updatedPouch, movement };
  });

  // 8. Broadcast live event via Socket.IO if available
  if (io) {
    io.emit('movement:recorded', {
      movement: result.movement,
      pouch: result.updatedPouch,
    });
    io.emit('dashboard:update');
  }

  return {
    success: true,
    pouch: result.updatedPouch,
    movement: result.movement,
  };
}

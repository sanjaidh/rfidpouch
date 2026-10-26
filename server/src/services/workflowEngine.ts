/**
 * Factory Workflow Engine & Status Transition Rules
 */

export const POUCH_STATUSES = [
  'Registered',
  'Awaiting Processing',
  'In Production',
  'Quality Inspection',
  'Packaging',
  'Completed',
  'Dispatched',
  'On Hold',
  'Delayed',
] as const;

export type PouchStatus = (typeof POUCH_STATUSES)[number];

export interface TransitionValidationResult {
  valid: boolean;
  requiresWarning?: boolean;
  message?: string;
  suggestedStatus?: PouchStatus;
}

// Configurable workflow stage ranking for forward progress
const STAGE_ORDER: Record<string, number> = {
  Registered: 0,
  'Awaiting Processing': 1,
  'In Production': 2,
  'Quality Inspection': 3,
  Packaging: 4,
  Completed: 5,
  Dispatched: 6,
};

/**
 * Validate status transition according to factory quality and dispatch rules
 */
export function validateStatusTransition(
  currentStatus: string,
  targetStatus: string,
  departmentName?: string,
  historySummary?: { hasQualityPassed?: boolean; hasPackaged?: boolean }
): TransitionValidationResult {
  // If no status change
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  // Any pouch can be placed On Hold or Delayed
  if (targetStatus === 'On Hold' || targetStatus === 'Delayed') {
    return { valid: true };
  }

  // If resuming from On Hold or Delayed
  if (currentStatus === 'On Hold' || currentStatus === 'Delayed') {
    return {
      valid: true,
      requiresWarning: true,
      message: `Pouch resumed from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  // Dispatch rules: cannot skip directly to Dispatched without prior Quality & Packaging
  if (targetStatus === 'Dispatched') {
    if (
      currentStatus === 'Registered' ||
      currentStatus === 'Awaiting Processing' ||
      currentStatus === 'In Production'
    ) {
      return {
        valid: false,
        message: `Workflow rule violation: Cannot dispatch pouch directly from '${currentStatus}'. It must complete 'Quality Inspection' and 'Packaging' first.`,
      };
    }

    if (historySummary && (!historySummary.hasQualityPassed || !historySummary.hasPackaged)) {
      return {
        valid: false,
        message:
          'Workflow rule violation: Pouch must pass Quality Inspection and Packaging stages before Dispatch.',
      };
    }
  }

  // Packaging rule: must have gone through Quality Inspection or In Production
  if (targetStatus === 'Packaging') {
    if (currentStatus === 'Registered') {
      return {
        valid: false,
        message: `Workflow rule violation: Cannot skip from '${currentStatus}' directly to 'Packaging'.`,
      };
    }
  }

  // Quality Inspection rule: must be in production or completed initial assembly
  if (targetStatus === 'Quality Inspection') {
    if (currentStatus === 'Registered') {
      return {
        valid: true,
        requiresWarning: true,
        message: 'Direct move from Registered to Quality Inspection flagged for review.',
      };
    }
  }

  return { valid: true };
}

/**
 * Infer recommended status based on destination department name
 */
export function inferStatusForDepartment(
  deptName: string,
  currentStatus: string
): PouchStatus {
  const normalized = deptName.toLowerCase();

  if (normalized.includes('receiving') || normalized.includes('raw')) {
    return 'Awaiting Processing';
  }
  if (normalized.includes('cutting') || normalized.includes('stitching') || normalized.includes('assembly')) {
    return 'In Production';
  }
  if (normalized.includes('quality') || normalized.includes('inspection')) {
    return 'Quality Inspection';
  }
  if (normalized.includes('pack')) {
    return 'Packaging';
  }
  if (normalized.includes('finished')) {
    return 'Completed';
  }
  if (normalized.includes('dispatch') || normalized.includes('shipping')) {
    return 'Dispatched';
  }

  return (currentStatus as PouchStatus) || 'In Production';
}

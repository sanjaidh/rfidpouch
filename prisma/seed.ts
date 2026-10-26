import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PouchTrack Factory Seed Script...');

  // Clean existing demonstration records
  await prisma.alert.deleteMany();
  await prisma.movementEvent.deleteMany();
  await prisma.pouch.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.department.deleteMany();
  await prisma.auditEvent.deleteMany();

  console.log('🧹 Cleaned existing records.');

  // 1. Create 8 Factory Departments and Checkpoints
  const departmentsData = [
    {
      name: 'Raw Material Receiving',
      description: 'Incoming textile, synthetic substrates, and hardware inspection dock.',
      checkpoints: [
        { name: 'Inward Dock Station', description: 'Primary container unloading and intake verification.' },
        { name: 'Fabric & Trim Inspection', description: 'Material quality, GSM, and defect verification.' },
      ],
    },
    {
      name: 'Cutting',
      description: 'Automated laser and mechanical pattern cutting floor.',
      checkpoints: [
        { name: 'CNC Automated Cutter', description: 'Multi-layer high-precision fabric cutting.' },
        { name: 'Die Cut Table 1', description: 'Precision stamping and die-cutting of reinforced corners.' },
      ],
    },
    {
      name: 'Stitching',
      description: 'Industrial heavy-duty joining and seam sealing.',
      checkpoints: [
        { name: 'Ultrasonic Seam Welder', description: 'Waterproof ultrasonic seam bonding.' },
        { name: 'Heavy Duty Stitcher 2', description: 'Reinforced dual-needle structural seam stitching.' },
      ],
    },
    {
      name: 'Assembly',
      description: 'Component integration, zipper installations, and internal pouch dividers.',
      checkpoints: [
        { name: 'Sub-Assembly Station A', description: 'Zippers, clasps, and internal webbing installation.' },
        { name: 'Final Hardware Fitting', description: 'Shock-cord, buckle assembly, and tag pocket attachment.' },
      ],
    },
    {
      name: 'Quality Inspection',
      description: 'ISO-9001 dimensional compliance, seal integrity, and load tolerance tests.',
      checkpoints: [
        { name: 'Dimensional & Seal Check', description: 'Optical measurement and seam burst pressure inspection.' },
        { name: 'Stress & Tensile Testing', description: 'Handle tensile load test and drop resistance check.' },
      ],
    },
    {
      name: 'Packaging',
      description: 'Protective packaging, moisture absorption inserts, and carton boxing.',
      checkpoints: [
        { name: 'Barcode & NFC Verification', description: 'Electronic tag payload verification and readability check.' },
        { name: 'Polybag & Box Packing', description: 'Unit bagging, desiccant pouch addition, and master pack.' },
      ],
    },
    {
      name: 'Finished Goods',
      description: 'Climate-controlled warehouse and automated pallet staging.',
      checkpoints: [
        { name: 'Racking Bay 4', description: 'High-density palletized pouch storage.' },
        { name: 'Buffer Storage Area', description: 'Pre-shipment batch collation and pick-order allocation.' },
      ],
    },
    {
      name: 'Dispatch',
      description: 'Outbound logistics, shipping documentation, and freight loading.',
      checkpoints: [
        { name: 'Outbound Staging Area', description: 'Final manifest verification and shipping label affixing.' },
        { name: 'Carrier Loading Bay', description: 'Direct freight transfer to temperature-controlled vehicle.' },
      ],
    },
  ];

  const createdDepartments: any[] = [];
  const createdCheckpoints: any[] = [];

  for (const deptData of departmentsData) {
    const dept = await prisma.department.create({
      data: {
        name: deptData.name,
        description: deptData.description,
        active: true,
      },
    });
    createdDepartments.push(dept);

    for (const cpData of deptData.checkpoints) {
      const cp = await prisma.checkpoint.create({
        data: {
          name: cpData.name,
          description: cpData.description,
          departmentId: dept.id,
          active: true,
        },
      });
      createdCheckpoints.push({ ...cp, departmentName: dept.name });
    }
  }

  console.log(`✅ Created ${createdDepartments.length} Departments and ${createdCheckpoints.length} Checkpoints.`);

  // 2. Create 30 Sample Pouches
  const pouchTypes = [
    'Heavy-Duty Kevlar Pouch',
    'ESD Anti-Static Component Pouch',
    'Thermal Insulated Sample Pouch',
    'High-Barrier Cleanroom Pouch',
    'Precision Aerospace Tool Pouch',
  ];

  const batchNumbers = [
    'BATCH-2026-OCT-A',
    'BATCH-2026-OCT-B',
    'BATCH-2026-OCT-C',
    'BATCH-2026-OCT-D',
  ];

  const operators = [
    'Rajesh Kumar (Tech-104)',
    'Ananya Sharma (Tech-208)',
    'David Chen (Lead-05)',
    'Marcus Vance (Op-312)',
    'Elena Rostova (QA-14)',
  ];

  // Distribute 30 pouches realistically across departments & statuses
  const distribution = [
    // 0-4: Raw Material Receiving (Awaiting Processing / Registered)
    { deptIndex: 0, cpIndex: 0, status: 'Registered', count: 2 },
    { deptIndex: 0, cpIndex: 1, status: 'Awaiting Processing', count: 3 },
    // 5-9: Cutting (In Production)
    { deptIndex: 1, cpIndex: 2, status: 'In Production', count: 3 },
    { deptIndex: 1, cpIndex: 3, status: 'In Production', count: 2 },
    // 10-14: Stitching (In Production / On Hold)
    { deptIndex: 2, cpIndex: 4, status: 'In Production', count: 3 },
    { deptIndex: 2, cpIndex: 5, status: 'On Hold', count: 2 },
    // 15-18: Assembly (In Production / Delayed)
    { deptIndex: 3, cpIndex: 6, status: 'In Production', count: 2 },
    { deptIndex: 3, cpIndex: 7, status: 'Delayed', count: 2 },
    // 19-22: Quality Inspection (Quality Inspection)
    { deptIndex: 4, cpIndex: 8, status: 'Quality Inspection', count: 2 },
    { deptIndex: 4, cpIndex: 9, status: 'Quality Inspection', count: 2 },
    // 23-25: Packaging (Packaging)
    { deptIndex: 5, cpIndex: 10, status: 'Packaging', count: 3 },
    // 26-27: Finished Goods (Completed)
    { deptIndex: 6, cpIndex: 12, status: 'Completed', count: 2 },
    // 28-29: Dispatch (Dispatched)
    { deptIndex: 7, cpIndex: 14, status: 'Dispatched', count: 2 },
  ];

  let pouchIndex = 1;
  const createdPouches: any[] = [];

  for (const group of distribution) {
    const dept = createdDepartments[group.deptIndex];
    const cp = createdCheckpoints[group.cpIndex];

    for (let c = 0; c < group.count; c++) {
      const serialNumber = `PCH-${String(pouchIndex).padStart(6, '0')}`;
      const batchNumber = batchNumbers[pouchIndex % batchNumbers.length];
      const pouchType = pouchTypes[pouchIndex % pouchTypes.length];
      const isTagProgrammed = pouchIndex > 3; // First 3 are unprogrammed for testing tag programming!

      // Timestamps staggered over last 5 days
      const daysAgo = Math.floor(Math.random() * 4);
      const registeredAt = new Date();
      registeredAt.setDate(registeredAt.getDate() - (daysAgo + 1));

      const lastScannedAt = new Date();
      lastScannedAt.setHours(lastScannedAt.getHours() - Math.floor(Math.random() * 24));

      const pouch = await prisma.pouch.create({
        data: {
          serialNumber,
          batchNumber,
          pouchType,
          currentDepartmentId: dept.id,
          currentCheckpointId: cp.id,
          status: group.status,
          description: `Demonstration test pouch ${serialNumber} (${pouchType}) for automated tracking.`,
          tagProgrammed: isTagProgrammed,
          active: true,
          registeredAt,
          lastScannedAt,
        },
      });

      createdPouches.push(pouch);
      pouchIndex++;
    }
  }

  console.log(`✅ Created ${createdPouches.length} Demonstration Pouches.`);

  // 3. Create Sample Movement Histories for advanced pouches
  console.log('📍 Generating realistic checkpoint movement history...');

  for (let i = 0; i < createdPouches.length; i++) {
    const pouch = createdPouches[i];
    // Pouches further along have multiple historical movements
    const numSteps = Math.min(Math.floor(i / 3) + 1, 5);

    let prevDept: any = null;
    let prevCp: any = null;
    let prevStatus = 'Registered';

    for (let s = 0; s < numSteps; s++) {
      const stepCheckpoint = createdCheckpoints[Math.min(s * 2, createdCheckpoints.length - 1)];
      const stepDept = createdDepartments.find((d) => d.id === stepCheckpoint.departmentId)!;
      const stepStatus = s === 0 ? 'Awaiting Processing' : s === 1 ? 'In Production' : s === 2 ? 'Quality Inspection' : s === 3 ? 'Packaging' : 'Completed';

      const eventTime = new Date();
      eventTime.setDate(eventTime.getDate() - (numSteps - s));
      eventTime.setHours(eventTime.getHours() + (s * 3));

      await prisma.movementEvent.create({
        data: {
          pouchId: pouch.id,
          pouchSerialNumber: pouch.serialNumber,
          previousDepartmentId: prevDept ? prevDept.id : null,
          previousCheckpointId: prevCp ? prevCp.id : null,
          newDepartmentId: stepDept.id,
          newCheckpointId: stepCheckpoint.id,
          previousStatus: prevStatus,
          newStatus: stepStatus,
          operatorName: operators[s % operators.length],
          source: s % 4 === 0 ? 'manual_entry' : 'phone_nfc',
          result: 'success',
          notes: `Batch inspection and transit through ${stepCheckpoint.name}`,
          occurredAt: eventTime,
        },
      });

      prevDept = stepDept;
      prevCp = stepCheckpoint;
      prevStatus = stepStatus;
    }
  }

  // 4. Create Sample Alerts and Exceptions
  console.log('⚠️ Generating demonstration factory alerts and exceptions...');

  await prisma.alert.create({
    data: {
      type: 'unexpected_transition',
      severity: 'high',
      pouchId: createdPouches[5].id,
      checkpointId: createdCheckpoints[14].id,
      description: `Workflow violation: Operator attempted to move pouch ${createdPouches[5].serialNumber} directly from In Production to Dispatch.`,
      resolutionStatus: 'open',
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  });

  await prisma.alert.create({
    data: {
      type: 'overdue_pouch',
      severity: 'medium',
      pouchId: createdPouches[17].id,
      checkpointId: createdCheckpoints[7].id,
      description: `Pouch ${createdPouches[17].serialNumber} has exceeded the 24-hour processing limit at Final Hardware Fitting.`,
      resolutionStatus: 'in_review',
      resolutionNotes: 'Supervisor flagged: waiting for specialty brass grommet replenishment.',
      createdAt: new Date(Date.now() - 3600000 * 8),
    },
  });

  await prisma.alert.create({
    data: {
      type: 'unregistered_tag',
      severity: 'high',
      description: 'Physical scan received payload POUCH:PCH-999999 which does not exist in registry.',
      resolutionStatus: 'open',
      createdAt: new Date(Date.now() - 3600000 * 14),
    },
  });

  await prisma.alert.create({
    data: {
      type: 'duplicate_movement',
      severity: 'low',
      pouchId: createdPouches[2].id,
      checkpointId: createdCheckpoints[1].id,
      description: `Duplicate NFC tap debounced within 3 seconds for ${createdPouches[2].serialNumber}.`,
      resolutionStatus: 'resolved',
      resolutionNotes: 'Operator tapped tag twice quickly. Deduplication handled cleanly.',
      createdAt: new Date(Date.now() - 3600000 * 24),
      resolvedAt: new Date(Date.now() - 3600000 * 23),
    },
  });

  console.log('🎉 Seed script completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import prisma from '../prisma.js';

export async function getDashboardSummary() {
  const [
    totalPouches,
    inProduction,
    awaitingProcessing,
    completed,
    delayed,
    onHold,
    totalMovements,
    openAlerts,
    programmedTags,
  ] = await Promise.all([
    prisma.pouch.count({ where: { active: true } }),
    prisma.pouch.count({ where: { active: true, status: 'In Production' } }),
    prisma.pouch.count({ where: { active: true, status: 'Awaiting Processing' } }),
    prisma.pouch.count({ where: { active: true, status: 'Completed' } }),
    prisma.pouch.count({ where: { active: true, status: 'Delayed' } }),
    prisma.pouch.count({ where: { active: true, status: 'On Hold' } }),
    prisma.movementEvent.count({ where: { result: 'success' } }),
    prisma.alert.count({ where: { resolutionStatus: 'open' } }),
    prisma.pouch.count({ where: { active: true, tagProgrammed: true } }),
  ]);

  // Successful scans today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const scansToday = await prisma.movementEvent.count({
    where: {
      result: 'success',
      occurredAt: { gte: startOfToday },
    },
  });

  // Department distribution
  const departments = await prisma.department.findMany({
    where: { active: true },
    include: {
      _count: {
        select: { currentPouches: { where: { active: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const pouchesByDepartment = departments.map((d) => ({
    departmentId: d.id,
    departmentName: d.name,
    count: d._count.currentPouches,
  }));

  // Status distribution
  const statusCounts = await prisma.pouch.groupBy({
    by: ['status'],
    where: { active: true },
    _count: { _all: true },
  });

  const statusDistribution = statusCounts.map((s) => ({
    status: s.status,
    count: s._count._all,
  }));

  // Daily movement volume for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentMovements = await prisma.movementEvent.findMany({
    where: {
      occurredAt: { gte: sevenDaysAgo },
    },
    select: {
      occurredAt: true,
      result: true,
    },
  });

  // Aggregate by day
  const dailyMap: Record<string, { date: string; success: number; rejected: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, success: 0, rejected: 0 };
  }

  recentMovements.forEach((m) => {
    const key = m.occurredAt.toISOString().split('T')[0];
    if (dailyMap[key]) {
      if (m.result === 'success') {
        dailyMap[key].success += 1;
      } else {
        dailyMap[key].rejected += 1;
      }
    }
  });

  const dailyVolume = Object.values(dailyMap);

  // Recent 10 scans / movements
  const recentActivity = await prisma.movementEvent.findMany({
    take: 10,
    orderBy: { occurredAt: 'desc' },
    include: {
      pouch: {
        select: {
          serialNumber: true,
          batchNumber: true,
        },
      },
      newDepartment: { select: { name: true } },
      newCheckpoint: { select: { name: true } },
    },
  });

  // Recent 5 alerts
  const recentExceptions = await prisma.alert.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { resolutionStatus: 'open' },
    include: {
      pouch: { select: { serialNumber: true } },
      checkpoint: { select: { name: true } },
    },
  });

  return {
    metrics: {
      totalPouches,
      inProduction,
      awaitingProcessing,
      completed,
      delayed,
      onHold,
      scansToday,
      totalMovements,
      openAlerts,
      programmedTags,
      unprogrammedTags: totalPouches - programmedTags,
    },
    pouchesByDepartment,
    statusDistribution,
    dailyVolume,
    recentActivity,
    recentExceptions,
  };
}

export async function getDetailedReports() {
  const summary = await getDashboardSummary();

  // Overdue pouches (in a department without movement for more than 48 hours and not completed/dispatched)
  const overdueThreshold = new Date();
  overdueThreshold.setHours(overdueThreshold.getHours() - 48);

  const overduePouches = await prisma.pouch.findMany({
    where: {
      active: true,
      status: { notIn: ['Completed', 'Dispatched'] },
      updatedAt: { lt: overdueThreshold },
    },
    include: {
      currentDepartment: true,
      currentCheckpoint: true,
    },
    take: 50,
  });

  // Alert frequency
  const alertStats = await prisma.alert.groupBy({
    by: ['type'],
    _count: { _all: true },
  });

  const alertFrequency = alertStats.map((a) => ({
    type: a.type,
    count: a._count._all,
  }));

  // Tag programming distribution
  const tagStats = [
    { name: 'Programmed', count: summary.metrics.programmedTags },
    { name: 'Not Programmed', count: summary.metrics.unprogrammedTags },
  ];

  return {
    ...summary,
    overduePouches,
    alertFrequency,
    tagStats,
  };
}

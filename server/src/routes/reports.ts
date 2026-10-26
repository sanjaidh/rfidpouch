import { Router, Request, Response } from 'express';
import { getDetailedReports } from '../services/reportService.js';

const router = Router();

// GET /api/reports/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const reportData = await getDetailedReports();
    res.json({ success: true, report: reportData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

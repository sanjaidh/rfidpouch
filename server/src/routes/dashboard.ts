import { Router, Request, Response } from 'express';
import { getDashboardSummary } from '../services/reportService.js';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await getDashboardSummary();
    res.json({ success: true, ...summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

import departmentsRouter from './routes/departments.js';
import checkpointsRouter from './routes/checkpoints.js';
import pouchesRouter from './routes/pouches.js';
import { createMovementsRouter } from './routes/movements.js';
import alertsRouter from './routes/alerts.js';
import dashboardRouter from './routes/dashboard.js';
import reportsRouter from './routes/reports.js';
import diagnosticsRouter from './routes/diagnostics.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for live dashboard updates
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pouchtrack-api',
  });
});

// Mount Routes
app.use('/api/departments', departmentsRouter);
app.use('/api/checkpoints', checkpointsRouter);
app.use('/api/pouches', pouchesRouter);
app.use('/api/movements', createMovementsRouter(io));
app.use('/api/alerts', alertsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/diagnostics', diagnosticsRouter);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PouchTrack Backend Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 WebSocket server initialized`);
  });
}

export { app, server, io };

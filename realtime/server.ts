// Real-time Event Service Server
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import realtimeRoutes from './index';
import { errorHandler } from '../shared/middleware/errorHandler';
import { connectDB, getDB } from '../shared/utils/mongodb';
import { WebSocketManager } from './websocket';
import { ChangeStreamHandler } from './changestream';

dotenv.config();

const app = express();
const PORT = process.env.REALTIME_PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'Real-time Event Service' });
});

app.use('/api/realtime', realtimeRoutes);

// Error Handler
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

let wsManager: WebSocketManager;
let changeStreamHandler: ChangeStreamHandler;

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    const db = await getDB();

    // Initialize WebSocket Manager
    wsManager = new WebSocketManager(wss);
    console.log('✅ WebSocket server initialized');

    // Initialize Change Stream Handler
    changeStreamHandler = new ChangeStreamHandler(db, wsManager);
    changeStreamHandler.startWatching();

    server.listen(PORT, () => {
      console.log(`🔄 Real-time Event Service running on port ${PORT}`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start Real-time Event Service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (changeStreamHandler) {
    changeStreamHandler.stop();
  }
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();

export default app;

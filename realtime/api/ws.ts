// WebSocket API Route Handler
import express from 'express';

const router = express.Router();

// This is just a placeholder route for the REST API
// The actual WebSocket server is set up in server.ts
router.get('/status', (_req, res) => {
  res.json({
    status: 'WebSocket server is running',
    endpoint: `ws://localhost:${process.env.REALTIME_PORT || 3005}/ws`
  });
});

export default router;

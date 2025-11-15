// Real-time Event Service Routes
import express from 'express';
import wsRouter from './api/ws';

const router = express.Router();

router.use('/ws', wsRouter);

export default router;

// File Service Routes
import express from 'express';
import uploadRouter from './api/upload';
import fileRouter from './api/file';

const router = express.Router();

router.use('/upload', uploadRouter);
router.use('/files', fileRouter);

export default router;

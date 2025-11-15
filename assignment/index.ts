// Assignment Service Routes
import express from 'express';
import assignmentRouter from './api/assignment';
import submissionRouter from './api/submission';

const router = express.Router();

router.use('/assignments', assignmentRouter);
router.use('/submissions', submissionRouter);

export default router;

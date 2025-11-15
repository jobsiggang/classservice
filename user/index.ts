// User/School Service Routes
import express from 'express';
import schoolRouter from './api/school';
import classRouter from './api/class';
import studentRouter from './api/student';
import superadminRouter from './api/superadmin';

const router = express.Router();

router.use('/superadmin', superadminRouter);
router.use('/schools', schoolRouter);
router.use('/classes', classRouter);
router.use('/students', studentRouter);

export default router;

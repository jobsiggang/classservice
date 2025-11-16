// Auth Service Routes
import express from 'express';
import loginRouter from './api/login';
import registerRouter from './api/register';
import meRouter from './api/me';
import refreshRouter from './api/refresh';
import changePasswordRouter from './api/change-password';

const router = express.Router();

router.use('/login', loginRouter);
router.use('/register', registerRouter);
router.use('/me', meRouter);
router.use('/refresh', refreshRouter);
router.use('/change-password', changePasswordRouter);

export default router;

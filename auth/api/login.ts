// 로그인 API
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { validateEmail, validateRequired } from '../../shared/utils/validation';
import { asyncHandler } from '../../shared/middleware/errorHandler';

const router = express.Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation
  const validation = validateRequired({ email, password });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  if (!validateEmail(email)) {
    return sendError(res, '유효하지 않은 이메일 형식입니다', 400);
  }

  // Find user
  const db = await getDB();
  const user = await db.collection('users').findOne({ email });

  if (!user) {
    return sendError(res, '사용자를 찾을 수 없습니다', 404);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return sendError(res, '비밀번호가 일치하지 않습니다', 401);
  }

  // 비밀번호 변경 필요 여부 확인
  const requirePasswordChange = user.requirePasswordChange === true;

  // Generate tokens
  const accessToken = jwt.sign(
    { 
      userId: user._id.toString(), 
      role: user.role, 
      schoolId: user.schoolId 
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '7d' }
  );

  // Update last login
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date() } }
  );

  return sendSuccess(res, {
    accessToken,
    refreshToken,
    requirePasswordChange, // 첫 로그인 시 비밀번호 변경 필요
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    }
  }, '로그인 성공');
}));

export default router;

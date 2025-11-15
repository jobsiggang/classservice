// 회원가입 API
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { validateEmail, validatePassword, validateRequired } from '../../shared/utils/validation';
import { asyncHandler } from '../../shared/middleware/errorHandler';

const router = express.Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, schoolId } = req.body;

  // Validation
  const validation = validateRequired({ name, email, password, role });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  if (!validateEmail(email)) {
    return sendError(res, '유효하지 않은 이메일 형식입니다', 400);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return sendError(res, passwordValidation.message!, 400);
  }

  // Prevent creating superadmin through regular registration
  if (role === 'superadmin') {
    return sendError(res, 'Super Admin은 직접 생성할 수 없습니다', 400);
  }

  if (!['admin', 'teacher', 'student'].includes(role)) {
    return sendError(res, '유효하지 않은 역할입니다', 400);
  }

  // Check if user exists
  const db = await getDB();
  const existingUser = await db.collection('users').findOne({ email });

  if (existingUser) {
    return sendError(res, '이미 존재하는 이메일입니다', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser = {
    name,
    email,
    password: hashedPassword,
    role,
    schoolId: schoolId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null
  };

  const result = await db.collection('users').insertOne(newUser);

  return sendCreated(res, {
    id: result.insertedId,
    name,
    email,
    role,
    schoolId
  }, '회원가입이 완료되었습니다');
}));

export default router;

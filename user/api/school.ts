// 학교 관리 API
import express, { Request, Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired } from '../../shared/utils/validation';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 학교 생성 + Admin 계정 자동 발급 (Super Admin만 가능)
router.post('/', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolName, adminName, adminEmail, adminPassword, subdomain } = req.body;

  const validation = validateRequired({ schoolName, adminName, adminEmail, adminPassword });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  // Check if admin email already exists
  const existingAdmin = await db.collection('users').findOne({ email: adminEmail });
  if (existingAdmin) {
    return sendError(res, '이미 존재하는 관리자 이메일입니다', 409);
  }

  // Generate unique schoolId
  const schoolId = subdomain || `school_${nanoid(12)}`;

  // Check if schoolId already exists
  const existingSchool = await db.collection('schools').findOne({ _id: schoolId } as any);
  if (existingSchool) {
    return sendError(res, '이미 존재하는 학교 ID입니다', 409);
  }

  // Create school
  const school = {
    _id: schoolId,
    name: schoolName,
    subdomain: schoolId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: req.user!.userId,
    settings: {
      allowStudentSubmit: true,
      requireApproval: false
    }
  };

  await db.collection('schools').insertOne(school);

  // Create admin account
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = {
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin' as const,
    schoolId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const adminResult = await db.collection('users').insertOne(admin);

  return sendCreated(res, {
    schoolId,
    schoolName,
    subdomain: `${schoolId}.fairschool.kr`,
    admin: {
      id: adminResult.insertedId,
      name: adminName,
      email: adminEmail
    }
  }, '학교와 관리자 계정이 생성되었습니다');
}));

// 학교 정보 조회
router.get('/:schoolId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;

  // 권한 확인: 같은 학교 사용자만 조회 가능
  if (req.user!.schoolId !== schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const db = await getDB();
  const school = await db.collection('schools').findOne({ _id: schoolId });

  if (!school) {
    return sendError(res, '학교를 찾을 수 없습니다', 404);
  }

  return sendSuccess(res, school);
}));

// 학교 설정 수정
router.patch('/:schoolId', verifyToken, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;
  const { name, settings } = req.body;

  if (req.user!.schoolId !== schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const db = await getDB();
  const updateData: any = { updatedAt: new Date() };

  if (name) updateData.name = name;
  if (settings) updateData.settings = settings;

  const result = await db.collection('schools').updateOne(
    { _id: schoolId } as any,
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    return sendError(res, '학교를 찾을 수 없습니다', 404);
  }

  return sendSuccess(res, { schoolId, updated: true }, '학교 정보가 수정되었습니다');
}));

// 교사 초대 (Admin만)
router.post('/:schoolId/invite-teacher', verifyToken, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;
  const { name, email, password } = req.body;

  if (req.user!.schoolId !== schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const validation = validateRequired({ name, email, password });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  // Check if teacher already exists
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    return sendError(res, '이미 존재하는 이메일입니다', 409);
  }

  // Create teacher account
  const hashedPassword = await bcrypt.hash(password, 10);
  const teacher = {
    name,
    email,
    password: hashedPassword,
    role: 'teacher' as const,
    schoolId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('users').insertOne(teacher);

  return sendCreated(res, {
    id: result.insertedId,
    name,
    email,
    role: 'teacher',
    schoolId
  }, '교사가 등록되었습니다');
}));

export default router;

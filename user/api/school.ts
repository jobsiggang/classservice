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

// 학교 생성 + Admin 계정 자동 발급 (슈퍼어드민 전용)
router.post('/', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolName, adminName, subdomain } = req.body;

  const validation = validateRequired({ schoolName, adminName });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  // Generate unique schoolId (서브도메인으로 사용)
  let schoolId = subdomain;
  if (!schoolId) {
    // subdomain이 없으면 학교명에서 생성
    schoolId = schoolName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 20) + '-' + nanoid(6);
  }

  // 서브도메인 형식 검증 (영문, 숫자, 하이픈만)
  if (!/^[a-z0-9-]+$/.test(schoolId)) {
    return sendError(res, '서브도메인은 영문 소문자, 숫자, 하이픈만 사용 가능합니다', 400);
  }

  // Check if schoolId already exists
  const existingSchool = await db.collection('schools').findOne({ _id: schoolId } as any);
  if (existingSchool) {
    return sendError(res, '이미 존재하는 학교 ID입니다. 다른 서브도메인을 사용해주세요.', 409);
  }

  // 관리자 이메일: 서브도메인@fairschool.kr
  const adminEmail = `${schoolId}@fairschool.kr`;
  
  // Check if admin email already exists
  const existingAdmin = await db.collection('users').findOne({ email: adminEmail });
  if (existingAdmin) {
    return sendError(res, '이미 존재하는 관리자 이메일입니다', 409);
  }

  // 초기 비밀번호: 이메일 주소와 동일
  const adminPassword = adminEmail;

  // Create school
  const school = {
    _id: schoolId,
    name: schoolName,
    subdomain: schoolId,
    domain: `${schoolId}.localhost:3001`, // 로컬 개발용
    productionDomain: `${schoolId}@fairschool.kr`, // 프로덕션용
    adminIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    settings: {
      allowStudentSubmit: true,
      requireApproval: false
    }
  };

  await db.collection('schools').insertOne(school as any);

  // Create admin account
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = {
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin' as const,
    schoolId,
    requirePasswordChange: true, // 첫 로그인 시 비밀번호 변경 필수
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const adminResult = await db.collection('users').insertOne(admin);

  // 학교의 adminIds 업데이트
  await db.collection('schools').updateOne(
    { _id: schoolId } as any,
    { $push: { adminIds: adminResult.insertedId.toString() } } as any
  );

  return sendCreated(res, {
    schoolId,
    schoolName,
    subdomain: schoolId,
    localUrl: `http://${schoolId}.localhost:3001`,
    productionUrl: `https://${schoolId}.fairschool.kr`,
    admin: {
      id: adminResult.insertedId,
      name: adminName,
      email: adminEmail,
      initialPassword: adminPassword // 슈퍼어드민에게만 표시
    }
  }, `학교가 생성되었습니다. 접속 주소: http://${schoolId}.localhost:3001`);
}));

// 학교 정보 조회
router.get('/:schoolId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;

  // 권한 확인: 슈퍼어드민은 모든 학교 조회 가능, 일반 사용자는 같은 학교만 조회 가능
  if (req.user!.role !== 'superadmin' && req.user!.schoolId !== schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const db = await getDB();
  const school = await db.collection('schools').findOne({ _id: schoolId } as any);

  if (!school) {
    return sendError(res, '학교를 찾을 수 없습니다', 404);
  }

  return sendSuccess(res, school);
}));

// 학교 설정 수정 (Admin 전용)
router.patch('/:schoolId', verifyToken, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;
  const { name, settings } = req.body;

  // 슈퍼어드민이 아닌 경우 자기 학교만 수정 가능
  if (req.user!.role !== 'superadmin' && req.user!.schoolId !== schoolId) {
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

// 교사 초대 (학교 Admin만)
router.post('/:schoolId/invite-teacher', verifyToken, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;
  const { name, email, password } = req.body;

  // 슈퍼어드민이 아닌 경우 자기 학교만 교사 초대 가능
  if (req.user!.role !== 'superadmin' && req.user!.schoolId !== schoolId) {
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

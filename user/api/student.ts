// 학생 관리 API
import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired, validateEmail } from '../../shared/utils/validation';
import { ObjectId } from 'mongodb';

const router = express.Router();

// 학생 등록 (Admin/Teacher만)
router.post('/', verifyToken, requireSchool, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, classId } = req.body;

  const validation = validateRequired({ name, email, password });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  if (!validateEmail(email)) {
    return sendError(res, '유효하지 않은 이메일 형식입니다', 400);
  }

  const db = await getDB();

  // Check if student already exists
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    return sendError(res, '이미 존재하는 이메일입니다', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const student = {
    name,
    email,
    password: hashedPassword,
    role: 'student' as const,
    schoolId: req.user!.schoolId,
    classId: classId || null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('users').insertOne(student);

  // If classId is provided, add student to class
  if (classId) {
    await db.collection('classes').updateOne(
      { _id: new ObjectId(classId) },
      { $addToSet: { studentIds: result.insertedId.toString() } }
    );
  }

  return sendCreated(res, {
    id: result.insertedId,
    name,
    email,
    role: 'student',
    schoolId: req.user!.schoolId,
    classId
  }, '학생이 등록되었습니다');
}));

// 학교별 학생 목록 조회
router.get('/', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const students = await db.collection('users')
    .find({ 
      schoolId: req.user!.schoolId,
      role: 'student'
    })
    .project({ password: 0 })
    .toArray();

  return sendSuccess(res, students);
}));

// 특정 학생 조회
router.get('/:studentId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  const db = await getDB();
  const student = await db.collection('users').findOne(
    { _id: new ObjectId(studentId), role: 'student' },
    { projection: { password: 0 } }
  );

  if (!student) {
    return sendError(res, '학생을 찾을 수 없습니다', 404);
  }

  if (student.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  return sendSuccess(res, student);
}));

// 학생 정보 수정
router.patch('/:studentId', verifyToken, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const { name, classId } = req.body;

  const db = await getDB();

  const student = await db.collection('users').findOne({ _id: new ObjectId(studentId), role: 'student' });

  if (!student) {
    return sendError(res, '학생을 찾을 수 없습니다', 404);
  }

  if (student.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const updateData: any = { updatedAt: new Date() };
  if (name) updateData.name = name;
  if (classId) updateData.classId = classId;

  await db.collection('users').updateOne(
    { _id: new ObjectId(studentId) },
    { $set: updateData }
  );

  return sendSuccess(res, { studentId, updated: true }, '학생 정보가 수정되었습니다');
}));

export default router;

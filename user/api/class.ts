// 학급 관리 API
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired } from '../../shared/utils/validation';
import { ObjectId } from 'mongodb';

const router = express.Router();

// 학급 생성 (Teacher/Admin만)
router.post('/', verifyToken, requireSchool, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, grade, teacherIds } = req.body;

  const validation = validateRequired({ name });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  const newClass = {
    name,
    grade: grade || null,
    schoolId: req.user!.schoolId,
    teacherIds: teacherIds || [req.user!.userId],
    studentIds: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('classes').insertOne(newClass);

  return sendCreated(res, {
    id: result.insertedId,
    ...newClass
  }, '학급이 생성되었습니다');
}));

// 학교별 학급 목록 조회
router.get('/', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const classes = await db.collection('classes')
    .find({ schoolId: req.user!.schoolId })
    .toArray();

  return sendSuccess(res, classes);
}));

// 특정 학급 조회
router.get('/:classId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;

  const db = await getDB();
  const classData = await db.collection('classes').findOne({ _id: new ObjectId(classId) });

  if (!classData) {
    return sendError(res, '학급을 찾을 수 없습니다', 404);
  }

  // 같은 학교인지 확인
  if (classData.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  return sendSuccess(res, classData);
}));

// 학급에 학생 추가
router.post('/:classId/students', verifyToken, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    return sendError(res, '학생 ID가 필요합니다', 400);
  }

  const db = await getDB();

  // 학급 확인
  const classData = await db.collection('classes').findOne({ _id: new ObjectId(classId) });
  if (!classData) {
    return sendError(res, '학급을 찾을 수 없습니다', 404);
  }

  if (classData.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  // 학생을 학급에 추가
  await db.collection('classes').updateOne(
    { _id: new ObjectId(classId) },
    { 
      $addToSet: { studentIds: studentId },
      $set: { updatedAt: new Date() }
    }
  );

  return sendSuccess(res, { classId, studentId }, '학생이 학급에 추가되었습니다');
}));

// 학급 삭제
router.delete('/:classId', verifyToken, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;

  const db = await getDB();
  const classData = await db.collection('classes').findOne({ _id: new ObjectId(classId) });

  if (!classData) {
    return sendError(res, '학급을 찾을 수 없습니다', 404);
  }

  if (classData.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  await db.collection('classes').deleteOne({ _id: new ObjectId(classId) });

  return sendSuccess(res, { classId }, '학급이 삭제되었습니다');
}));

export default router;

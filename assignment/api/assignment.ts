// 과제 생성/수정/삭제/조회 API
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired } from '../../shared/utils/validation';
import { ObjectId } from 'mongodb';

const router = express.Router();

// 과제 생성 (Teacher만)
router.post('/', verifyToken, requireSchool, requireRole('teacher', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, classId, dueDate, fileIds } = req.body;

  const validation = validateRequired({ title, classId, dueDate });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  // Verify class belongs to same school
  const classData = await db.collection('classes').findOne({ _id: new ObjectId(classId) });
  if (!classData) {
    return sendError(res, '학급을 찾을 수 없습니다', 404);
  }

  if (classData.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const assignment = {
    title,
    description: description || '',
    classId,
    teacherId: req.user!.userId,
    schoolId: req.user!.schoolId,
    dueDate: new Date(dueDate),
    fileIds: fileIds || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  };

  const result = await db.collection('assignments').insertOne(assignment);

  return sendCreated(res, {
    id: result.insertedId,
    ...assignment
  }, '과제가 생성되었습니다');
}));

// 과제 목록 조회
router.get('/', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.query;

  const db = await getDB();
  const query: any = { schoolId: req.user!.schoolId };

  if (classId) {
    query.classId = classId;
  }

  // Student: 자신의 class 과제만
  if (req.user!.role === 'student') {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user!.userId) });
    if (user?.classId) {
      query.classId = user.classId;
    }
  }

  const assignments = await db.collection('assignments')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return sendSuccess(res, assignments);
}));

// 특정 과제 조회
router.get('/:assignmentId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const db = await getDB();
  const assignment = await db.collection('assignments').findOne({ _id: new ObjectId(assignmentId) });

  if (!assignment) {
    return sendError(res, '과제를 찾을 수 없습니다', 404);
  }

  if (assignment.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  // Get submission count
  const submissionCount = await db.collection('submissions').countDocuments({ assignmentId });

  return sendSuccess(res, {
    ...assignment,
    submissionCount
  });
}));

// 과제 수정 (Teacher만)
router.patch('/:assignmentId', verifyToken, requireRole('teacher', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const { title, description, dueDate, status } = req.body;

  const db = await getDB();
  const assignment = await db.collection('assignments').findOne({ _id: new ObjectId(assignmentId) });

  if (!assignment) {
    return sendError(res, '과제를 찾을 수 없습니다', 404);
  }

  if (assignment.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const updateData: any = { updatedAt: new Date() };
  if (title) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate) updateData.dueDate = new Date(dueDate);
  if (status) updateData.status = status;

  await db.collection('assignments').updateOne(
    { _id: new ObjectId(assignmentId) },
    { $set: updateData }
  );

  return sendSuccess(res, { assignmentId, updated: true }, '과제가 수정되었습니다');
}));

// 과제 삭제 (Teacher만)
router.delete('/:assignmentId', verifyToken, requireRole('teacher', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const db = await getDB();
  const assignment = await db.collection('assignments').findOne({ _id: new ObjectId(assignmentId) });

  if (!assignment) {
    return sendError(res, '과제를 찾을 수 없습니다', 404);
  }

  if (assignment.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  await db.collection('assignments').deleteOne({ _id: new ObjectId(assignmentId) });

  // Also delete all submissions
  await db.collection('submissions').deleteMany({ assignmentId });

  return sendSuccess(res, { assignmentId }, '과제가 삭제되었습니다');
}));

export default router;

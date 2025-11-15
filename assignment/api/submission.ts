// 제출물 업로드/조회/피드백 API
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired } from '../../shared/utils/validation';
import { ObjectId } from 'mongodb';

const router = express.Router();

// 제출물 생성 (Student만)
router.post('/', verifyToken, requireSchool, requireRole('student'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId, content, fileIds } = req.body;

  const validation = validateRequired({ assignmentId });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  // Verify assignment exists and belongs to student's school
  const assignment = await db.collection('assignments').findOne({ _id: new ObjectId(assignmentId) });
  if (!assignment) {
    return sendError(res, '과제를 찾을 수 없습니다', 404);
  }

  if (assignment.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  // Check if already submitted
  const existing = await db.collection('submissions').findOne({
    assignmentId,
    studentId: req.user!.userId
  });

  if (existing) {
    return sendError(res, '이미 제출한 과제입니다', 409);
  }

  const submission = {
    assignmentId,
    studentId: req.user!.userId,
    schoolId: req.user!.schoolId,
    content: content || '',
    fileIds: fileIds || [],
    submittedAt: new Date(),
    status: 'submitted',
    grade: null,
    feedback: null,
    comments: []
  };

  const result = await db.collection('submissions').insertOne(submission);

  return sendCreated(res, {
    id: result.insertedId,
    ...submission
  }, '과제가 제출되었습니다');
}));

// 과제별 제출물 목록 조회 (Teacher)
router.get('/assignment/:assignmentId', verifyToken, requireRole('teacher', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const db = await getDB();

  // Verify assignment
  const assignment = await db.collection('assignments').findOne({ _id: new ObjectId(assignmentId) });
  if (!assignment) {
    return sendError(res, '과제를 찾을 수 없습니다', 404);
  }

  if (assignment.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const submissions = await db.collection('submissions')
    .find({ assignmentId })
    .sort({ submittedAt: -1 })
    .toArray();

  // Get student info for each submission
  const studentIds = submissions.map(s => new ObjectId(s.studentId));
  const students = await db.collection('users')
    .find({ _id: { $in: studentIds } })
    .project({ password: 0 })
    .toArray();

  const submissionsWithStudents = submissions.map(sub => ({
    ...sub,
    student: students.find(s => s._id.toString() === sub.studentId)
  }));

  return sendSuccess(res, submissionsWithStudents);
}));

// 학생 본인의 제출물 조회
router.get('/my-submissions', verifyToken, requireRole('student'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const submissions = await db.collection('submissions')
    .find({ studentId: req.user!.userId })
    .sort({ submittedAt: -1 })
    .toArray();

  // Get assignment info
  const assignmentIds = submissions.map(s => new ObjectId(s.assignmentId));
  const assignments = await db.collection('assignments')
    .find({ _id: { $in: assignmentIds } })
    .toArray();

  const submissionsWithAssignments = submissions.map(sub => ({
    ...sub,
    assignment: assignments.find(a => a._id.toString() === sub.assignmentId)
  }));

  return sendSuccess(res, submissionsWithAssignments);
}));

// 특정 제출물 조회
router.get('/:submissionId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;

  const db = await getDB();
  const submission = await db.collection('submissions').findOne({ _id: new ObjectId(submissionId) });

  if (!submission) {
    return sendError(res, '제출물을 찾을 수 없습니다', 404);
  }

  // Authorization check
  if (req.user!.role === 'student' && submission.studentId !== req.user!.userId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  if (submission.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  return sendSuccess(res, submission);
}));

// 피드백 및 점수 추가 (Teacher만)
router.patch('/:submissionId/feedback', verifyToken, requireRole('teacher', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;
  const { feedback, grade } = req.body;

  const db = await getDB();
  const submission = await db.collection('submissions').findOne({ _id: new ObjectId(submissionId) });

  if (!submission) {
    return sendError(res, '제출물을 찾을 수 없습니다', 404);
  }

  if (submission.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const updateData: any = {};
  if (feedback !== undefined) updateData.feedback = feedback;
  if (grade !== undefined) updateData.grade = grade;
  updateData.gradedAt = new Date();
  updateData.gradedBy = req.user!.userId;

  await db.collection('submissions').updateOne(
    { _id: new ObjectId(submissionId) },
    { $set: updateData }
  );

  return sendSuccess(res, { submissionId, updated: true }, '피드백이 추가되었습니다');
}));

// 댓글 추가
router.post('/:submissionId/comments', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;
  const { content } = req.body;

  if (!content) {
    return sendError(res, '댓글 내용이 필요합니다', 400);
  }

  const db = await getDB();
  const submission = await db.collection('submissions').findOne({ _id: new ObjectId(submissionId) });

  if (!submission) {
    return sendError(res, '제출물을 찾을 수 없습니다', 404);
  }

  if (submission.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const comment = {
    id: new ObjectId().toString(),
    userId: req.user!.userId,
    content,
    createdAt: new Date()
  };

  await db.collection('submissions').updateOne(
    { _id: new ObjectId(submissionId) },
    { $push: { comments: comment } as any }
  );

  return sendSuccess(res, comment, '댓글이 추가되었습니다');
}));

export default router;

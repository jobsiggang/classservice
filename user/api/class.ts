// 학급 관리 API
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired } from '../../shared/utils/validation';
import { ObjectId } from 'mongodb';

const router = express.Router();

// 클래스 코드 생성 함수
function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 과목 클래스 생성 (Teacher/Admin만)
router.post('/', verifyToken, requireSchool, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, studentIds } = req.body;

  const validation = validateRequired({ name });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  const db = await getDB();

  // 고유한 클래스 코드 생성
  let classCode = generateClassCode();
  let existing = await db.collection('classes').findOne({ classCode });
  while (existing) {
    classCode = generateClassCode();
    existing = await db.collection('classes').findOne({ classCode });
  }

  const newClass = {
    name, // 과목명 (예: "수학", "영어")
    description: description || '', // 과목 설명
    classCode,
    schoolId: req.user!.schoolId,
    teacherIds: [req.user!.userId],
    studentIds: studentIds || [], // 선택한 학생들 또는 빈 배열
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('Creating class:', newClass); // 디버깅용 로그

  const result = await db.collection('classes').insertOne(newClass as any);
  
  console.log('Class created with ID:', result.insertedId); // 디버깅용 로그

  // 선택된 학생들의 classIds 배열에 이 클래스 추가
  if (studentIds && studentIds.length > 0) {
    const classIdStr = result.insertedId.toString();
    await db.collection('users').updateMany(
      { 
        _id: { $in: studentIds.map((id: string) => new ObjectId(id)) },
        role: 'student'
      },
      { 
        $addToSet: { classIds: classIdStr }
      }
    );
  }

  return sendCreated(res, {
    _id: result.insertedId,
    ...newClass
  }, '과목이 생성되었습니다');
}));

// 학생이 클래스 코드로 가입 (Student만)
router.post('/join', verifyToken, requireRole('student'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classCode } = req.body;

  if (!classCode) {
    return sendError(res, '클래스 코드가 필요합니다', 400);
  }

  const db = await getDB();

  const classData = await db.collection('classes').findOne({ classCode });
  if (!classData) {
    return sendError(res, '올바르지 않은 클래스 코드입니다', 404);
  }

  // 같은 학교인지 확인
  if (classData.schoolId !== req.user!.schoolId) {
    return sendError(res, '다른 학교의 클래스입니다', 403);
  }

  // 이미 가입되어 있는지 확인
  if (classData.studentIds.includes(req.user!.userId)) {
    return sendError(res, '이미 가입된 클래스입니다', 400);
  }

  // 학생을 클래스에 추가
  await db.collection('classes').updateOne(
    { _id: classData._id },
    { 
      $addToSet: { studentIds: req.user!.userId },
      $set: { updatedAt: new Date() }
    }
  );

  // 사용자의 classIds 배열에 추가 (여러 클래스 등록 가능)
  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user!.userId) },
    { 
      $addToSet: { classIds: classData._id.toString() },
      $unset: { classId: "" } // 기존 단일 classId 제거
    }
  );

  return sendSuccess(res, { classId: classData._id, className: classData.name }, '클래스에 가입되었습니다');
}));

// 학교별 학급 목록 조회
router.get('/', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  let query: any = { schoolId: req.user!.schoolId };
  
  // 교사는 자기가 만든 클래스만 조회
  if (req.user!.role === 'teacher') {
    query.teacherIds = req.user!.userId;
  }
  // 학생은 자기가 속한 클래스들 조회 (여러 개)
  else if (req.user!.role === 'student') {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user!.userId) });
    const classIds = user?.classIds || [];
    
    if (classIds.length === 0) {
      // 클래스에 속하지 않은 학생은 빈 배열 반환
      return sendSuccess(res, []);
    }
    
    query._id = { $in: classIds.map((id: string) => new ObjectId(id)) };
  }

  const classes = await db.collection('classes')
    .find(query)
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

// 학급에 학생 추가 (관리자/교사가 선택한 학생들 추가)
router.post('/:classId/students', verifyToken, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { studentIds } = req.body; // 배열로 받음

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return sendError(res, '학생 ID 목록이 필요합니다', 400);
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

  // 학생들이 같은 학교 소속인지 확인
  const students = await db.collection('users').find({
    _id: { $in: studentIds.map(id => new ObjectId(id)) },
    schoolId: req.user!.schoolId,
    role: 'student'
  }).toArray();

  if (students.length !== studentIds.length) {
    return sendError(res, '일부 학생을 찾을 수 없거나 권한이 없습니다', 400);
  }

  // 학생들을 학급에 추가
  await db.collection('classes').updateOne(
    { _id: new ObjectId(classId) },
    { 
      $addToSet: { studentIds: { $each: studentIds } },
      $set: { updatedAt: new Date() }
    }
  );

  // 학생들의 classId 업데이트
  await db.collection('users').updateMany(
    { _id: { $in: studentIds.map(id => new ObjectId(id)) } },
    { $set: { classId: classId } }
  );

  return sendSuccess(res, { classId, addedCount: students.length }, `${students.length}명의 학생이 학급에 추가되었습니다`);
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

  // 학생들의 classIds 배열에서 이 클래스 제거
  await db.collection('users').updateMany(
    { classIds: classId },
    { $pull: { classIds: classId } as any }
  );

  // 클래스 삭제
  await db.collection('classes').deleteOne({ _id: new ObjectId(classId) });

  return sendSuccess(res, { classId }, '학급이 삭제되었습니다');
}));

export default router;

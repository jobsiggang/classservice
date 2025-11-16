// 교사 관리 API
import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import Papa from 'papaparse';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { validateRequired, validateEmail } from '../../shared/utils/validation';
import { ObjectId } from 'mongodb';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 교사 등록 (Admin만)
router.post('/', verifyToken, requireSchool, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password } = req.body;

  const validation = validateRequired({ name, email, password });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  if (!validateEmail(email)) {
    return sendError(res, '유효하지 않은 이메일 형식입니다', 400);
  }

  const db = await getDB();

  // Check if teacher already exists
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    return sendError(res, '이미 존재하는 이메일입니다', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const teacher = {
    name,
    email,
    password: hashedPassword,
    role: 'teacher' as const,
    schoolId: req.user!.schoolId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('users').insertOne(teacher);

  return sendCreated(res, {
    id: result.insertedId,
    name,
    email,
    role: 'teacher',
    schoolId: req.user!.schoolId
  }, '교사가 등록되었습니다');
}));

// 학교별 교사 목록 조회
router.get('/', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const teachers = await db.collection('users')
    .find({ 
      schoolId: req.user!.schoolId,
      role: 'teacher'
    })
    .project({ password: 0 })
    .toArray();

  return sendSuccess(res, teachers);
}));

// 특정 교사 조회
router.get('/:teacherId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teacherId } = req.params;

  const db = await getDB();
  const teacher = await db.collection('users').findOne(
    { _id: new ObjectId(teacherId), role: 'teacher' },
    { projection: { password: 0 } }
  );

  if (!teacher) {
    return sendError(res, '교사를 찾을 수 없습니다', 404);
  }

  if (teacher.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  return sendSuccess(res, teacher);
}));

// 교사 정보 수정
router.put('/:teacherId', verifyToken, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teacherId } = req.params;
  const { name, email } = req.body;

  const db = await getDB();

  const teacher = await db.collection('users').findOne({ 
    _id: new ObjectId(teacherId),
    role: 'teacher'
  });

  if (!teacher) {
    return sendError(res, '교사를 찾을 수 없습니다', 404);
  }

  if (teacher.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  // Check if email is being changed and if it already exists
  if (email && email !== teacher.email) {
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return sendError(res, '이미 존재하는 이메일입니다', 409);
    }

    if (!validateEmail(email)) {
      return sendError(res, '유효하지 않은 이메일 형식입니다', 400);
    }
  }

  const updateData: any = { updatedAt: new Date() };
  if (name) updateData.name = name;
  if (email) updateData.email = email;

  await db.collection('users').updateOne(
    { _id: new ObjectId(teacherId) },
    { $set: updateData }
  );

  const updatedTeacher = await db.collection('users').findOne(
    { _id: new ObjectId(teacherId) },
    { projection: { password: 0 } }
  );

  return sendSuccess(res, updatedTeacher, '교사 정보가 수정되었습니다');
}));

// 교사 삭제
router.delete('/:teacherId', verifyToken, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teacherId } = req.params;

  const db = await getDB();

  const teacher = await db.collection('users').findOne({ 
    _id: new ObjectId(teacherId),
    role: 'teacher'
  });

  if (!teacher) {
    return sendError(res, '교사를 찾을 수 없습니다', 404);
  }

  if (teacher.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  await db.collection('users').deleteOne({ _id: new ObjectId(teacherId) });

  return sendSuccess(res, null, '교사가 삭제되었습니다');
}));

// CSV 업로드로 교사 일괄 등록
router.post('/upload-csv', verifyToken, requireSchool, requireRole('admin'), upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, 'CSV 파일이 필요합니다', 400);
  }

  const csvContent = req.file.buffer.toString('utf-8');
  
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    return sendError(res, 'CSV 파싱 오류', 400, { errors: parsed.errors });
  }

  const teachers = parsed.data as any[];
  
  const db = await getDB();
  const results = {
    success: [] as string[],
    failed: [] as { row: number; email: string; reason: string }[]
  };

  for (let i = 0; i < teachers.length; i++) {
    const row = teachers[i];
    
    if (!row.name || !row.email || !row.password) {
      results.failed.push({
        row: i + 2,
        email: row.email || 'unknown',
        reason: '필수 필드 누락 (name, email, password 필요)'
      });
      continue;
    }

    if (!validateEmail(row.email)) {
      results.failed.push({
        row: i + 2,
        email: row.email,
        reason: '유효하지 않은 이메일 형식'
      });
      continue;
    }

    // Check if teacher already exists
    const existing = await db.collection('users').findOne({ email: row.email });
    if (existing) {
      results.failed.push({
        row: i + 2,
        email: row.email,
        reason: '이미 존재하는 이메일'
      });
      continue;
    }

    try {
      const hashedPassword = await bcrypt.hash(row.password, 10);

      const teacher = {
        name: row.name.trim(),
        email: row.email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'teacher' as const,
        schoolId: req.user!.schoolId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('users').insertOne(teacher);
      results.success.push(row.email);
    } catch (error) {
      results.failed.push({
        row: i + 2,
        email: row.email,
        reason: '등록 중 오류 발생'
      });
    }
  }

  return sendSuccess(res, results, `${results.success.length}명의 교사가 등록되었습니다`);
}));

// CSV 템플릿 다운로드
router.get('/download-template', (req, res) => {
  const template = 'name,email,password\n홍길동,teacher1@example.com,password123\n김교사,teacher2@example.com,password456';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=teachers_template.csv');
  res.send(template);
});

// 교사 목록 CSV 다운로드
router.get('/download-csv', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const teachers = await db.collection('users')
    .find({ 
      schoolId: req.user!.schoolId,
      role: 'teacher'
    })
    .project({ password: 0, _id: 0, role: 0, schoolId: 0, createdAt: 0, updatedAt: 0 })
    .toArray();

  const csv = Papa.unparse(teachers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=teachers.csv');
  res.send(csv);
}));

export default router;

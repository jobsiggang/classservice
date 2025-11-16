// 학생 관리 API
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

// 학생 등록 (Admin/Teacher만)
router.post('/', verifyToken, requireSchool, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, grade, classNum, number, enrollmentYear } = req.body;

  const validation = validateRequired({ name, email, password });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  if (!validateEmail(email)) {
    return sendError(res, '유효하지 않은 이메일 형식입니다', 400);
  }

  // 학번 생성을 위한 필드 검증
  if (!grade || !classNum || !number) {
    return sendError(res, '학년, 반, 번호는 필수입니다', 400);
  }

  const db = await getDB();

  // 이메일 중복 체크
  const existingEmail = await db.collection('users').findOne({ 
    email,
    schoolId: req.user!.schoolId 
  });
  if (existingEmail) {
    return sendError(res, '이미 존재하는 이메일입니다', 409);
  }

  // 학번 자동 생성
  const studentNumber = `${grade}${String(classNum).padStart(2, '0')}${String(number).padStart(2, '0')}`;

  // 학번 중복 체크
  const existingStudentNumber = await db.collection('users').findOne({ 
    studentNumber,
    schoolId: req.user!.schoolId,
    role: 'student'
  });
  if (existingStudentNumber) {
    return sendError(res, `학번 ${studentNumber}이(가) 이미 존재합니다`, 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const student = {
    name,
    email,
    password: hashedPassword,
    studentNumber,
    enrollmentYear: enrollmentYear || new Date().getFullYear(),
    grade: parseInt(grade),
    classNum: parseInt(classNum),
    number: parseInt(number),
    role: 'student' as const,
    schoolId: req.user!.schoolId,
    classIds: [], // 빈 배열로 시작, 나중에 클래스 코드로 가입
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('users').insertOne(student);

  return sendCreated(res, {
    id: result.insertedId,
    name,
    email,
    studentNumber,
    grade,
    role: 'student',
    schoolId: req.user!.schoolId,
    classIds: []
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
router.put('/:studentId', verifyToken, requireRole('admin', 'teacher'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const { name, email, studentNumber, classId, grade, classNum, number } = req.body;

  if (!ObjectId.isValid(studentId)) {
    return sendError(res, '유효하지 않은 학생 ID입니다', 400);
  }

  const db = await getDB();

  const student = await db.collection('users').findOne({ 
    _id: new ObjectId(studentId), 
    role: 'student' 
  });

  if (!student) {
    return sendError(res, '학생을 찾을 수 없습니다', 404);
  }

  if (student.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  const updateData: any = { updatedAt: new Date() };
  
  if (name) updateData.name = name;
  
  // 이메일 변경 시에만 중복 체크
  if (email && email !== student.email) {
    const existingEmail = await db.collection('users').findOne({ 
      email,
      schoolId: req.user!.schoolId,
      _id: { $ne: new ObjectId(studentId) }
    });
    if (existingEmail) {
      return sendError(res, '이미 존재하는 이메일입니다', 409);
    }
    updateData.email = email;
  }
  
  // 학번 변경 시에만 중복 체크
  if (studentNumber && studentNumber !== student.studentNumber) {
    const existingStudentNumber = await db.collection('users').findOne({ 
      studentNumber,
      schoolId: req.user!.schoolId,
      role: 'student',
      _id: { $ne: new ObjectId(studentId) }
    });
    if (existingStudentNumber) {
      return sendError(res, '이미 존재하는 학번입니다', 409);
    }
    updateData.studentNumber = studentNumber;
  }
  
  if (classId) updateData.classId = classId;
  if (grade !== undefined) updateData.grade = parseInt(grade);
  if (classNum !== undefined) updateData.classNum = parseInt(classNum);
  if (number !== undefined) updateData.number = parseInt(number);

  await db.collection('users').updateOne(
    { _id: new ObjectId(studentId) },
    { $set: updateData }
  );

  return sendSuccess(res, { studentId, updated: true }, '학생 정보가 수정되었습니다');
}));

// 학생 정보 수정 (PATCH - 하위 호환)
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

// CSV 다운로드
router.get('/export/csv', verifyToken, requireSchool, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const students = await db.collection('users')
    .find({ 
      schoolId: req.user!.schoolId,
      role: 'student'
    })
    .project({ password: 0, _id: 0 })
    .toArray();

  // CSV 형식으로 변환
  const csv = Papa.unparse(students.map(s => ({
    이름: s.name,
    이메일: s.email,
    입학년도: s.enrollmentYear || '',
    학년: s.grade || '',
    반: s.classNum || '',
    번호: s.number || '',
    학번: s.studentNumber || '',
    클래스ID: s.classId || '',
    생성일: new Date(s.createdAt).toLocaleDateString('ko-KR')
  })));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=students_${Date.now()}.csv`);
  res.send('\uFEFF' + csv); // UTF-8 BOM 추가 (한글 깨짐 방지)
}));

// CSV 업로드
router.post('/import/csv', verifyToken, requireSchool, requireRole('admin', 'teacher'), upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, 'CSV 파일이 필요합니다', 400);
  }

  const csvData = req.file.buffer.toString('utf-8');
  
  // CSV 파싱
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    return sendError(res, 'CSV 파싱 오류', 400, { errors: parsed.errors });
  }

  const db = await getDB();
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const row of parsed.data as any[]) {
    try {
      const name = row['이름'] || row['name'];
      const email = row['이메일'] || row['email'];
      const enrollmentYear = row['입학년도'] || row['enrollmentYear'];
      const grade = row['학년'] || row['grade'];
      const classNum = row['반'] || row['classNum'];
      const number = row['번호'] || row['number'];
      const classId = row['클래스ID'] || row['classId'] || null;
      const password = row['비밀번호'] || row['password'] || '1234';

      // 필수값 체크
      if (!name || !email) {
        results.failed++;
        results.errors.push(`${name || '이름없음'}: 이름과 이메일은 필수입니다`);
        continue;
      }

      // 학번 생성 필드 체크
      if (!grade || !classNum || !number) {
        results.failed++;
        results.errors.push(`${name}: 학년, 반, 번호는 필수입니다`);
        continue;
      }

      // 학번 자동 생성 (학년 + 반(2자리) + 번호(2자리))
      const studentNumber = `${grade}${String(classNum).padStart(2, '0')}${String(number).padStart(2, '0')}`;

      // 이메일 중복 체크
      const existingEmail = await db.collection('users').findOne({ 
        email,
        schoolId: req.user!.schoolId 
      });
      if (existingEmail) {
        results.failed++;
        results.errors.push(`${email}: 이미 존재하는 이메일`);
        continue;
      }

      // 학번 중복 체크
      const existingStudentNumber = await db.collection('users').findOne({ 
        studentNumber,
        schoolId: req.user!.schoolId,
        role: 'student'
      });
      if (existingStudentNumber) {
        results.failed++;
        results.errors.push(`${name} (학번 ${studentNumber}): 이미 존재하는 학번`);
        continue;
      }

      // 학생 생성
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const student = {
        name,
        email,
        password: hashedPassword,
        studentNumber,
        enrollmentYear: enrollmentYear || new Date().getFullYear(),
        grade: parseInt(grade),
        classNum: parseInt(classNum),
        number: parseInt(number),
        role: 'student' as const,
        schoolId: req.user!.schoolId,
        classId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('users').insertOne(student);
      results.success++;

    } catch (error: any) {
      results.failed++;
      results.errors.push(`${row['이름'] || 'Unknown'}: ${error.message}`);
    }
  }

  return sendSuccess(res, results, `${results.success}명 업로드 성공, ${results.failed}명 실패`);
}));

// 학생 삭제 (Admin만)
router.delete('/:id', verifyToken, requireSchool, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return sendError(res, '유효하지 않은 학생 ID입니다', 400);
  }

  const db = await getDB();

  const result = await db.collection('users').deleteOne({
    _id: new ObjectId(id),
    schoolId: req.user!.schoolId,
    role: 'student'
  });

  if (result.deletedCount === 0) {
    return sendError(res, '학생을 찾을 수 없습니다', 404);
  }

  return sendSuccess(res, null, '학생이 삭제되었습니다');
}));

export default router;


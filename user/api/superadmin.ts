// Super Admin API Routes
import express, { Request, Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError, sendCreated } from '../../shared/utils/response';
import { verifyToken, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 초기 설정 상태 확인 (인증 불필요)
router.get('/check-setup', asyncHandler(async (_req: Request, res: Response) => {
  const db = await getDB();
  
  // 슈퍼어드민이 존재하는지 확인
  const superAdminCount = await db.collection('users').countDocuments({ 
    role: 'superadmin' 
  });
  
  return sendSuccess(res, {
    hasSuper: superAdminCount > 0,
    needsSetup: superAdminCount === 0
  });
}));

// 슈퍼어드민 초기 설정 (인증 불필요, 한 번만 가능)
router.post('/setup', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return sendError(res, '모든 필드를 입력해주세요', 400);
  }
  
  if (password.length < 6) {
    return sendError(res, '비밀번호는 최소 6자 이상이어야 합니다', 400);
  }
  
  const db = await getDB();
  
  // 이미 슈퍼어드민이 존재하는지 확인
  const existingSuper = await db.collection('users').findOne({ role: 'superadmin' });
  if (existingSuper) {
    return sendError(res, '슈퍼어드민이 이미 존재합니다', 403);
  }
  
  // 이메일 중복 확인
  const existingEmail = await db.collection('users').findOne({ email });
  if (existingEmail) {
    return sendError(res, '이미 사용 중인 이메일입니다', 400);
  }
  
  // 슈퍼어드민 계정 생성
  const hashedPassword = await bcrypt.hash(password, 10);
  const superAdmin = {
    name,
    email,
    password: hashedPassword,
    role: 'superadmin' as const,
    schoolId: null,
    isSuperAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.collection('users').insertOne(superAdmin);
  
  return sendCreated(res, {
    id: result.insertedId,
    name,
    email,
    role: 'superadmin'
  }, '슈퍼어드민 계정이 생성되었습니다');
}));

// 데이터베이스 초기화 (인증 필요 - 슈퍼어드민만 또는 슈퍼어드민이 없을 때만)
router.post('/reset-database', asyncHandler(async (req: Request, res: Response) => {
  const db = await getDB();
  
  // 슈퍼어드민 존재 확인
  const superAdminCount = await db.collection('users').countDocuments({ role: 'superadmin' });
  
  // 슈퍼어드민이 있으면 인증 필요
  if (superAdminCount > 0) {
    const authHeader = req.headers?.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return sendError(res, '슈퍼어드민 인증이 필요합니다', 401);
    }
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role: string };
      
      if (decoded.role !== 'superadmin') {
        return sendError(res, '슈퍼어드민만 초기화할 수 있습니다', 403);
      }
    } catch (error) {
      return sendError(res, '유효하지 않은 토큰입니다', 401);
    }
  }
  
  // 모든 컬렉션 삭제
  const collections = ['users', 'schools', 'classes', 'students', 'assignments', 'submissions', 'files'];
  
  for (const collectionName of collections) {
    try {
      await db.collection(collectionName).deleteMany({});
    } catch (error) {
      console.log(`Collection ${collectionName} cleanup:`, error);
    }
  }
  
  return sendSuccess(res, {
    deletedCollections: collections,
    message: '모든 데이터가 삭제되었습니다'
  }, '데이터베이스가 초기화되었습니다');
}));

// 학교 생성 (Super Admin만)
router.post('/schools', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolName, adminName, adminEmail, adminPassword } = req.body;

  if (!schoolName || !adminName || !adminEmail || !adminPassword) {
    return sendError(res, '모든 필드를 입력해주세요', 400);
  }

  const db = await getDB();

  // 이메일 중복 체크
  const existingUser = await db.collection('users').findOne({ email: adminEmail });
  if (existingUser) {
    return sendError(res, '이미 등록된 이메일입니다', 400);
  }

  // 학교 ID 생성
  const schoolId = `school_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 학교 생성
  const school = {
    _id: schoolId,
    name: schoolName,
    adminIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      allowStudentSubmit: true,
      requireApproval: false
    }
  };

  await db.collection('schools').insertOne(school as any);

  // 학교 관리자 생성
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = {
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    schoolId: schoolId,
    isSuperAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const adminResult = await db.collection('users').insertOne(admin as any);

  // 학교의 adminIds 업데이트
  await db.collection('schools').updateOne(
    { _id: schoolId } as any,
    { $push: { adminIds: adminResult.insertedId.toString() } } as any
  );

  return sendCreated(res, { school, admin: { ...admin, _id: adminResult.insertedId } }, '학교가 생성되었습니다');
}));

// 학교 관리자 권한 부여 (Super Admin만)
router.post('/schools/:schoolId/admins', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return sendError(res, '사용자 ID가 필요합니다', 400);
  }

  const db = await getDB();

  // 학교 확인
  const school = await db.collection('schools').findOne({ _id: schoolId } as any);
  if (!school) {
    return sendError(res, '학교를 찾을 수 없습니다', 404);
  }

  // 사용자 확인 및 권한 변경
  const user = await db.collection('users').findOne({ _id: userId } as any);
  if (!user) {
    return sendError(res, '사용자를 찾을 수 없습니다', 404);
  }

  if (user.schoolId !== schoolId) {
    return sendError(res, '해당 학교 소속 사용자가 아닙니다', 400);
  }

  // 관리자 권한 부여
  await db.collection('users').updateOne(
    { _id: userId } as any,
    { 
      $set: { 
        role: 'admin',
        updatedAt: new Date()
      } 
    }
  );

  // 학교의 adminIds에 추가
  await db.collection('schools').updateOne(
    { _id: schoolId } as any,
    { $addToSet: { adminIds: userId } } as any
  );

  return sendSuccess(res, { userId, schoolId }, '관리자 권한이 부여되었습니다');
}));

// 모든 학교 목록 조회 (Super Admin만)
router.get('/schools', verifyToken, requireRole('superadmin'), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = await getDB();

  const schools = await db.collection('schools')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Get user count for each school
  const schoolsWithStats = await Promise.all(schools.map(async (school) => {
    const userCount = await db.collection('users').countDocuments({ schoolId: school._id });
    const adminCount = await db.collection('users').countDocuments({ schoolId: school._id, role: 'admin' });
    const teacherCount = await db.collection('users').countDocuments({ schoolId: school._id, role: 'teacher' });
    const studentCount = await db.collection('users').countDocuments({ schoolId: school._id, role: 'student' });

    return {
      ...school,
      stats: {
        totalUsers: userCount,
        admins: adminCount,
        teachers: teacherCount,
        students: studentCount
      }
    };
  }));

  return sendSuccess(res, schoolsWithStats);
}));

// 특정 학교 상세 정보 (Super Admin만)
router.get('/schools/:schoolId', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;

  const db = await getDB();
  const school = await db.collection('schools').findOne({ _id: schoolId } as any);

  if (!school) {
    return sendError(res, '학교를 찾을 수 없습니다', 404);
  }

  // Get all users for this school
  const users = await db.collection('users')
    .find({ schoolId })
    .project({ password: 0 })
    .toArray();

  return sendSuccess(res, {
    ...school,
    users
  });
}));

// 학교 삭제 (Super Admin만)
router.delete('/schools/:schoolId', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;

  const db = await getDB();

  // Check if school exists
  const school = await db.collection('schools').findOne({ _id: schoolId } as any);
  if (!school) {
    return sendError(res, '학교를 찾을 수 없습니다', 404);
  }

  // Delete all related data
  await Promise.all([
    db.collection('schools').deleteOne({ _id: schoolId } as any),
    db.collection('users').deleteMany({ schoolId }),
    db.collection('classes').deleteMany({ schoolId }),
    db.collection('assignments').deleteMany({ schoolId }),
    db.collection('submissions').deleteMany({ schoolId }),
    db.collection('files').deleteMany({ schoolId })
  ]);

  return sendSuccess(res, { schoolId }, '학교와 관련된 모든 데이터가 삭제되었습니다');
}));

// 전체 통계 (Super Admin만)
router.get('/stats', verifyToken, requireRole('superadmin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();
  const { schoolId } = req.query;

  // 특정 학교 통계
  if (schoolId) {
    const school = await db.collection('schools').findOne({ _id: schoolId as string } as any);
    
    if (!school) {
      return sendError(res, '학교를 찾을 수 없습니다', 404);
    }

    const schoolIdValue = school._id || school.schoolId;
    const [
      teacherCount,
      studentCount,
      classCount
    ] = await Promise.all([
      db.collection('users').countDocuments({ schoolId: schoolIdValue, role: 'teacher' }),
      db.collection('users').countDocuments({ schoolId: schoolIdValue, role: 'student' }),
      db.collection('classes').countDocuments({ schoolId: schoolIdValue })
    ]);

    return sendSuccess(res, {
      totalSchools: 1,
      totalTeachers: teacherCount,
      totalStudents: studentCount,
      totalClasses: classCount,
      schoolStats: [{
        schoolId: schoolIdValue,
        subdomain: school.subdomain || schoolIdValue,
        name: school.name,
        teacherCount,
        studentCount,
        classCount
      }]
    });
  }

  // 전체 통계
  const [
    totalSchools,
    totalTeachers,
    totalStudents,
    totalClasses
  ] = await Promise.all([
    db.collection('schools').countDocuments({}),
    db.collection('users').countDocuments({ role: 'teacher' }),
    db.collection('users').countDocuments({ role: 'student' }),
    db.collection('classes').countDocuments({})
  ]);

  // 학교별 통계
  const schools = await db.collection('schools').find({}).toArray();
  const schoolStats = await Promise.all(
    schools.map(async (school) => {
      const schoolIdValue = school._id || school.schoolId;
      const [teacherCount, studentCount, classCount] = await Promise.all([
        db.collection('users').countDocuments({ schoolId: schoolIdValue, role: 'teacher' }),
        db.collection('users').countDocuments({ schoolId: schoolIdValue, role: 'student' }),
        db.collection('classes').countDocuments({ schoolId: schoolIdValue })
      ]);

      return {
        schoolId: schoolIdValue,
        subdomain: school.subdomain || schoolIdValue,
        name: school.name,
        teacherCount,
        studentCount,
        classCount
      };
    })
  );

  return sendSuccess(res, {
    totalSchools,
    totalTeachers,
    totalStudents,
    totalClasses,
    schoolStats
  });
}));

// 모든 사용자 조회 (Super Admin만)
router.get('/users', verifyToken, requireRole('superadmin'), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = await getDB();

  const users = await db.collection('users')
    .find({ role: { $ne: 'superadmin' } })
    .project({ password: 0 })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return sendSuccess(res, users);
}));

export default router;

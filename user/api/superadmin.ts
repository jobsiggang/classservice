// Super Admin API Routes
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { verifyToken, requireRole, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';

const router = express.Router();

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
router.get('/stats', verifyToken, requireRole('superadmin'), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = await getDB();

  const [
    totalSchools,
    totalUsers,
    totalAdmins,
    totalTeachers,
    totalStudents,
    totalClasses,
    totalAssignments,
    totalSubmissions
  ] = await Promise.all([
    db.collection('schools').countDocuments({}),
    db.collection('users').countDocuments({ role: { $ne: 'superadmin' } }),
    db.collection('users').countDocuments({ role: 'admin' }),
    db.collection('users').countDocuments({ role: 'teacher' }),
    db.collection('users').countDocuments({ role: 'student' }),
    db.collection('classes').countDocuments({}),
    db.collection('assignments').countDocuments({}),
    db.collection('submissions').countDocuments({})
  ]);

  return sendSuccess(res, {
    schools: totalSchools,
    users: {
      total: totalUsers,
      admins: totalAdmins,
      teachers: totalTeachers,
      students: totalStudents
    },
    classes: totalClasses,
    assignments: totalAssignments,
    submissions: totalSubmissions
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

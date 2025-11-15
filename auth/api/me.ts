// 사용자 정보 조회 API
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.get('/', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(req.user!.userId) },
    { projection: { password: 0 } }
  );

  if (!user) {
    return sendError(res, '사용자를 찾을 수 없습니다', 404);
  }

  return sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    createdAt: user.createdAt
  });
}));

// 권한 확인 API
router.get('/verify-role', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  return sendSuccess(res, {
    userId: req.user!.userId,
    role: req.user!.role,
    schoolId: req.user!.schoolId
  });
}));

export default router;

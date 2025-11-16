// 비밀번호 변경 API
import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { validateRequired } from '../../shared/utils/validation';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.post('/', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const validation = validateRequired({ currentPassword, newPassword });
  if (!validation.valid) {
    return sendError(res, '필수값 누락', 400, { missing: validation.missing });
  }

  if (newPassword.length < 6) {
    return sendError(res, '새 비밀번호는 최소 6자 이상이어야 합니다', 400);
  }

  const db = await getDB();
  const user = await db.collection('users').findOne({ 
    _id: new ObjectId(req.user!.userId) 
  });

  if (!user) {
    return sendError(res, '사용자를 찾을 수 없습니다', 404);
  }

  // 현재 비밀번호 확인
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return sendError(res, '현재 비밀번호가 일치하지 않습니다', 401);
  }

  // 새 비밀번호 해시
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 비밀번호 업데이트 및 requirePasswordChange 플래그 제거
  await db.collection('users').updateOne(
    { _id: user._id },
    { 
      $set: { 
        password: hashedPassword,
        updatedAt: new Date()
      },
      $unset: { requirePasswordChange: "" } // 플래그 제거
    }
  );

  return sendSuccess(res, null, '비밀번호가 성공적으로 변경되었습니다');
}));

export default router;

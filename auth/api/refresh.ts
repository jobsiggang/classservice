// JWT 토큰 갱신 API
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'Refresh token이 필요합니다', 400);
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as {
      userId: string;
    };

    // Get user from database
    const db = await getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return sendError(res, '사용자를 찾을 수 없습니다', 404);
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        userId: user._id.toString(), 
        role: user.role, 
        schoolId: user.schoolId 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    return sendSuccess(res, {
      accessToken
    }, '토큰이 갱신되었습니다');

  } catch (error) {
    return sendError(res, '유효하지 않은 refresh token입니다', 401);
  }
}));

export default router;

// 파일 정보 조회 API
import express, { Response } from 'express';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';

const router = express.Router();

// 파일 정보 조회
router.get('/:fileId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;

  const db = await getDB();
  const file = await db.collection('files').findOne({ _id: fileId });

  if (!file) {
    return sendError(res, '파일을 찾을 수 없습니다', 404);
  }

  // 같은 학교 사용자만 접근 가능
  if (file.schoolId !== req.user!.schoolId) {
    return sendError(res, '권한이 없습니다', 403);
  }

  return sendSuccess(res, file);
}));

// 사용자별 파일 목록 조회
router.get('/', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDB();

  const files = await db.collection('files')
    .find({ schoolId: req.user!.schoolId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return sendSuccess(res, files);
}));

// 파일 삭제
router.delete('/:fileId', verifyToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;

  const db = await getDB();
  const file = await db.collection('files').findOne({ _id: fileId });

  if (!file) {
    return sendError(res, '파일을 찾을 수 없습니다', 404);
  }

  // Only uploader or admin can delete
  if (file.uploaderId !== req.user!.userId && req.user!.role !== 'admin') {
    return sendError(res, '권한이 없습니다', 403);
  }

  await db.collection('files').deleteOne({ _id: fileId });

  // TODO: Delete from S3 as well

  return sendSuccess(res, { fileId }, '파일이 삭제되었습니다');
}));

export default router;

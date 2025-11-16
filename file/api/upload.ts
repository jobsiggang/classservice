// 파일 업로드 API
import express, { Response } from 'express';
import multer from 'multer';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { verifyToken, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { uploadToGoogleStorage } from '../../shared/utils/googleStorage';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, PDFs, and common document types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다'));
    }
  },
});

// File upload endpoint
router.post('/', verifyToken, requireSchool, upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, '파일이 필요합니다', 400);
  }

  const { originalname, mimetype, size, buffer } = req.file;
  const fileId = nanoid(16);
  
  try {
    // Upload to Google Cloud Storage
    const folderPath = `${req.user!.schoolId}/uploads`;
    const result = await uploadToGoogleStorage(buffer, originalname, mimetype, folderPath);

    // Save file metadata to database
    const db = await getDB();
    const fileDoc = {
      _id: fileId,
      originalName: originalname,
      fileName: originalname,
      url: result.webViewLink,
      downloadUrl: result.webContentLink,
      gcsFilePath: result.fileId, // GCS 파일 경로
      mimeType: mimetype,
      size,
      uploaderId: req.user!.userId,
      schoolId: req.user!.schoolId,
      createdAt: new Date(),
    };

    await db.collection('files').insertOne(fileDoc as any);

    return sendSuccess(res, {
      fileId,
      url: result.webViewLink,
      downloadUrl: result.webContentLink,
      originalName: originalname,
      mimeType: mimetype,
      size,
    }, '파일이 업로드되었습니다');

  } catch (error) {
    console.error('File upload error:', error);
    return sendError(res, '파일 업로드에 실패했습니다', 500);
  }
}));

// Multiple files upload
router.post('/multiple', verifyToken, requireSchool, upload.array('files', 5), asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return sendError(res, '파일이 필요합니다', 400);
  }

  const uploadedFiles = [];
  const db = await getDB();

  for (const file of files) {
    const { originalname, mimetype, size, buffer } = file;
    const fileId = nanoid(16);

    try {
      // Upload to Google Cloud Storage
      const folderPath = `${req.user!.schoolId}/uploads`;
      const result = await uploadToGoogleStorage(buffer, originalname, mimetype, folderPath);

      const fileDoc = {
        _id: fileId,
        originalName: originalname,
        fileName: originalname,
        url: result.webViewLink,
        downloadUrl: result.webContentLink,
        gcsFilePath: result.fileId,
        mimeType: mimetype,
        size,
        uploaderId: req.user!.userId,
        schoolId: req.user!.schoolId,
        createdAt: new Date(),
      };

      await db.collection('files').insertOne(fileDoc as any);

      uploadedFiles.push({
        fileId,
        url: result.webViewLink,
        downloadUrl: result.webContentLink,
        originalName: originalname,
        mimeType: mimetype,
        size,
      });
    } catch (error) {
      console.error('File upload error:', error);
    }
  }

  return sendSuccess(res, uploadedFiles, `${uploadedFiles.length}개의 파일이 업로드되었습니다`);
}));

// 과제 제출용 파일 업로드 (classId/assignmentId/studentNumber 구조)
router.post('/assignment', verifyToken, requireSchool, upload.array('files', 5), asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { classId, assignmentId } = req.body;

  if (!files || files.length === 0) {
    return sendError(res, '파일이 필요합니다', 400);
  }

  if (!classId || !assignmentId) {
    return sendError(res, 'classId와 assignmentId가 필요합니다', 400);
  }

  const db = await getDB();
  
  // 학생 정보 조회하여 학번 가져오기
  const student = await db.collection('users').findOne({ 
    _id: new ObjectId(req.user!.userId),
    role: 'student'
  });

  if (!student || !student.studentNumber) {
    return sendError(res, '학생 정보를 찾을 수 없습니다', 404);
  }

  const uploadedFiles = [];

  for (const file of files) {
    const { originalname, mimetype, size, buffer } = file;
    const fileId = nanoid(16);

    try {
      // classId/assignmentId/studentNumber 폴더 구조
      const folderPath = `${classId}/${assignmentId}/${student.studentNumber}`;
      const result = await uploadToGoogleStorage(buffer, originalname, mimetype, folderPath);

      const fileDoc = {
        _id: fileId,
        originalName: originalname,
        fileName: originalname,
        url: result.webViewLink,
        downloadUrl: result.webContentLink,
        gcsFilePath: result.fileId, // GCS 파일 경로
        mimeType: mimetype,
        size,
        uploaderId: req.user!.userId,
        schoolId: req.user!.schoolId,
        classId,
        assignmentId,
        studentNumber: student.studentNumber,
        folderPath, // 나중에 찾기 쉽게 경로 저장
        createdAt: new Date(),
      };

      await db.collection('files').insertOne(fileDoc as any);

      uploadedFiles.push({
        fileId,
        url: result.webViewLink,
        downloadUrl: result.webContentLink,
        originalName: originalname,
        mimeType: mimetype,
        size,
      });
    } catch (error) {
      console.error('File upload error:', error);
    }
  }

  return sendSuccess(res, uploadedFiles, `${uploadedFiles.length}개의 파일이 업로드되었습니다`);
}));

export default router;

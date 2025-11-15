// 파일 업로드 API
import express, { Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getDB } from '../../shared/utils/mongodb';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { verifyToken, requireSchool, AuthRequest } from '../../shared/middleware/auth';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { nanoid } from 'nanoid';

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

// S3 Client (if AWS is configured)
let s3Client: S3Client | null = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// File upload endpoint
router.post('/', verifyToken, requireSchool, upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, '파일이 필요합니다', 400);
  }

  const { originalname, mimetype, size, buffer } = req.file;
  const fileId = nanoid(16);
  const fileName = `${fileId}_${originalname}`;
  let fileUrl = '';

  try {
    if (s3Client) {
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: `uploads/${req.user!.schoolId}/${fileName}`,
        Body: buffer,
        ContentType: mimetype,
      });

      await s3Client.send(command);
      fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${req.user!.schoolId}/${fileName}`;
    } else {
      // Local storage fallback (development only)
      // In production, you should use S3 or similar cloud storage
      fileUrl = `/uploads/${fileName}`;
      // TODO: Save file to local filesystem in development
    }

    // Save file metadata to database
    const db = await getDB();
    const fileDoc = {
      _id: fileId,
      originalName: originalname,
      fileName,
      url: fileUrl,
      mimeType: mimetype,
      size,
      uploaderId: req.user!.userId,
      schoolId: req.user!.schoolId,
      createdAt: new Date(),
    };

    await db.collection('files').insertOne(fileDoc);

    return sendSuccess(res, {
      fileId,
      url: fileUrl,
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
    const fileName = `${fileId}_${originalname}`;
    let fileUrl = '';

    try {
      if (s3Client) {
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: `uploads/${req.user!.schoolId}/${fileName}`,
          Body: buffer,
          ContentType: mimetype,
        });

        await s3Client.send(command);
        fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${req.user!.schoolId}/${fileName}`;
      } else {
        fileUrl = `/uploads/${fileName}`;
      }

      const fileDoc = {
        _id: fileId,
        originalName: originalname,
        fileName,
        url: fileUrl,
        mimeType: mimetype,
        size,
        uploaderId: req.user!.userId,
        schoolId: req.user!.schoolId,
        createdAt: new Date(),
      };

      await db.collection('files').insertOne(fileDoc);

      uploadedFiles.push({
        fileId,
        url: fileUrl,
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

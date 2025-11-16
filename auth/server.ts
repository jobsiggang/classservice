// Auth Service Server
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './index';
import { errorHandler } from '../shared/middleware/errorHandler';
import { connectDB, getDB } from '../shared/utils/mongodb';

dotenv.config();

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false  // HTML에서 inline script 사용 허용
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 학교별 서브도메인 미들웨어
app.use(async (req, res, next) => {
  const host = req.headers.host || '';
  console.log('Host:', host);
  
  // admin 서브도메인 체크 (슈퍼어드민 전용)
  const subdomain = host.split('.')[0];
  if (subdomain === 'admin') {
    (req as any).isAdminPortal = true;
    console.log('Admin portal access detected');
    return next();
  }
  
  // localhost:3001 또는 IP 주소로 직접 접근한 경우
  if (host.includes('localhost:3001') || host.match(/^\d+\.\d+\.\d+\.\d+/)) {
    // 서브도메인이 localhost가 아니고 유효한 경우
    if (subdomain !== 'localhost' && subdomain !== host.split(':')[0]) {
      try {
        const db = await getDB();
        const school = await db.collection('schools').findOne({ subdomain } as any);
        
        if (school) {
          // 학교 정보를 요청에 추가
          (req as any).school = school;
          (req as any).schoolId = school._id;
          console.log('School detected:', school.name);
        }
      } catch (error) {
        console.error('School lookup error:', error);
      }
    }
  }
  
  next();
});

// 정적 파일 서빙 - 빌드 전 소스에서 직접 제공
app.use(express.static(path.join(__dirname, '../../public')));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'Auth Service' });
});

app.use('/api/auth', authRoutes);

// SPA fallback - 모든 경로를 index.html로
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🔐 Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
};

startServer();

export default app;

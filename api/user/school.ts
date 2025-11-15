import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { connectToDatabase } from '../../shared/utils/mongoose';
import { School } from '../../user/models/School';
import { User } from '../../auth/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT 검증 헬퍼
async function verifyToken(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET) as any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const decoded = await verifyToken(req);
    await connectToDatabase();

    // GET - 학교 목록 조회 (Super Admin만)
    if (req.method === 'GET') {
      if (decoded.role !== 'superadmin') {
        return res.status(403).json({ error: 'Super Admin only' });
      }

      const schools = await School.find().sort({ createdAt: -1 });
      return res.status(200).json(schools);
    }

    // POST - 학교 생성 (Super Admin만)
    if (req.method === 'POST') {
      if (decoded.role !== 'superadmin') {
        return res.status(403).json({ error: 'Super Admin only' });
      }

      const { name, adminEmail, adminName, adminPassword } = req.body;

      if (!name || !adminEmail || !adminName || !adminPassword) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // schoolId 생성 (URL safe)
      const schoolId = nanoid(10);

      // 학교 생성
      const school = await School.create({
        schoolId,
        name,
        settings: {
          allowStudentSubmission: true,
          maxFileSize: 10485760 // 10MB
        }
      });

      // 학교 관리자 계정 생성
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const admin = await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'admin',
        schoolId: school.schoolId
      });

      return res.status(201).json({
        school: {
          id: school._id,
          schoolId: school.schoolId,
          name: school.name,
          subdomain: `${school.schoolId}.fairschool.kr`
        },
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('School API error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

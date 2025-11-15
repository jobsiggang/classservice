// Super Admin Seeder
// 최초 1회 실행하여 Super Admin 계정 생성

import bcrypt from 'bcryptjs';
import { getDB, connectDB, closeDB } from '../shared/utils/mongodb';

const SUPER_ADMIN_EMAIL = 'superadmin@fairschool.kr';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin123!';
const SUPER_ADMIN_NAME = 'Super Administrator';

async function createSuperAdmin() {
  try {
    await connectDB();
    const db = await getDB();

    // Check if super admin already exists
    const existing = await db.collection('users').findOne({ 
      email: SUPER_ADMIN_EMAIL 
    });

    if (existing) {
      console.log('⚠️  Super Admin already exists!');
      console.log('Email:', SUPER_ADMIN_EMAIL);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    // Create super admin
    const superAdmin = {
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'superadmin',
      schoolId: null, // Super admin doesn't belong to any school
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [
        'create_school',
        'delete_school',
        'manage_all_schools',
        'view_all_users',
        'system_settings'
      ]
    };

    const result = await db.collection('users').insertOne(superAdmin);

    console.log('✅ Super Admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', SUPER_ADMIN_EMAIL);
    console.log('Password:', SUPER_ADMIN_PASSWORD);
    console.log('Role: superadmin');
    console.log('ID:', result.insertedId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Please save these credentials securely!');
    console.log('🔗 Login at: http://admin.fairschool.kr');

  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    process.exit(1);
  } finally {
    await closeDB();
    process.exit(0);
  }
}

createSuperAdmin();

import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "teacher" | "student";
  schoolId?: string;
  classIds?: string[]; // 학생이 수강 중인 클래스들 (여러 개)
  grade?: number; // 학년 (학생용)
  classNumber?: string; // 학번 (학생용)
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'teacher', 'student'], default: 'student' },
  schoolId: { type: String, required: false },
  classIds: { type: [String], required: false, default: [] }, // 학생용
  grade: { type: Number, required: false }, // 학생용
  classNumber: { type: String, required: false } // 학생용
}, {
  timestamps: true
});

// Vercel Serverless에서 모델이 중복 생성되지 않도록 처리
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// Legacy export for compatibility
export interface User {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "teacher" | "student";
  schoolId?: string;
  classIds?: string[]; // 학생이 수강 중인 클래스들
  grade?: number; // 학년 (학생용)
  classNumber?: string; // 학번 (학생용)
}

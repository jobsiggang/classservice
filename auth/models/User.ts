import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "teacher" | "student";
  schoolId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'teacher', 'student'], default: 'student' },
  schoolId: { type: String, required: false }
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
}

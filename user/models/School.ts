import mongoose, { Document, Schema } from 'mongoose';

export interface ISchool extends Document {
  schoolId: string;
  name: string;
  settings: {
    allowStudentSubmission: boolean;
    maxFileSize: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>({
  schoolId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  settings: {
    allowStudentSubmission: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 10485760 } // 10MB
  }
}, {
  timestamps: true
});

// Vercel Serverless에서 모델이 중복 생성되지 않도록 처리
export const School = mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema);

// Legacy export for compatibility
export interface School {
  _id?: string;
  schoolId: string;
  name: string;
  adminId?: string;
  settings?: {
    allowStudentSubmission: boolean;
    maxFileSize: number;
  };
}

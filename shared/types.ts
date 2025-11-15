// Shared Type Definitions

export interface User {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  schoolId: string | null; // null for superadmin
  classId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  permissions?: string[]; // For superadmin
}

export interface School {
  _id: string; // Custom ID: school_xxx123
  name: string;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    allowStudentSubmit: boolean;
    requireApproval: boolean;
  };
}

export interface Class {
  _id?: string;
  name: string;
  grade?: string;
  schoolId: string;
  teacherIds: string[];
  studentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  _id?: string;
  title: string;
  description: string;
  classId: string;
  teacherId: string;
  schoolId: string;
  dueDate: Date;
  fileIds: string[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  _id?: string;
  assignmentId: string;
  studentId: string;
  schoolId: string;
  content: string;
  fileIds: string[];
  submittedAt: Date;
  status: 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface FileMetadata {
  _id: string; // Custom ID from nanoid
  originalName: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  uploaderId: string;
  schoolId: string;
  createdAt: Date;
}

export interface WebSocketMessage {
  type: 'connected' | 'assignment.created' | 'assignment.updated' | 'submission.created' | 'submission.graded' | 'class.created' | 'notification' | 'ping' | 'pong';
  message?: string;
  data?: any;
  userId?: string;
  schoolId?: string;
}

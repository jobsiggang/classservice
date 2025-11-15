export interface Submission {
  _id?: string;
  assignmentId: string;
  studentId: string;
  fileId: string;
  submittedAt: Date;
  feedback?: string;
}

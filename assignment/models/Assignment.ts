export interface Assignment {
  _id?: string;
  title: string;
  description: string;
  classId: string;
  teacherId: string;
  schoolId: string;
  dueDate: Date;
}

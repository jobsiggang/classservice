export interface Student {
  _id?: string;
  name: string;
  email: string;
  schoolId: string;
  grade: number; // 학년
  classNumber: string; // 학번
  classIds: string[]; // 수강 중인 과목(클래스) 목록
  createdAt?: Date;
  updatedAt?: Date;
}

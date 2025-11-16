export interface Class {
  _id?: string;
  name: string; // 과목명 (예: "수학", "영어", "과학")
  description?: string; // 과목 설명
  classCode: string; // 학생 가입용 코드
  schoolId: string;
  teacherIds: string[]; // 담당 교사들
  studentIds: string[]; // 수강 학생들
  createdAt?: Date;
  updatedAt?: Date;
}

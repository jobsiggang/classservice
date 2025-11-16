// 클래스-학생 데이터 동기화 스크립트
// 클래스의 studentIds에 있는 학생들의 classIds를 업데이트

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function syncClassStudents() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fairproject';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    const db = client.db(process.env.DB_NAME || 'fairproject');

    // 모든 클래스 조회
    const classes = await db.collection('classes').find({}).toArray();
    console.log(`📚 총 ${classes.length}개 클래스 발견`);

    let updatedCount = 0;

    for (const cls of classes) {
      console.log(`\n🔄 클래스 처리 중: ${cls.name} (${cls.classCode})`);
      console.log(`   학생 수: ${cls.studentIds?.length || 0}`);

      if (!cls.studentIds || cls.studentIds.length === 0) {
        console.log('   ⏭️  등록된 학생이 없음, 건너뜀');
        continue;
      }

      const classIdStr = cls._id.toString();

      // 이 클래스에 속한 학생들의 classIds 배열에 클래스 ID 추가
      const result = await db.collection('users').updateMany(
        {
          _id: { $in: cls.studentIds.map((id: any) => typeof id === 'string' ? id : id.toString()) },
          role: 'student'
        },
        {
          $addToSet: { classIds: classIdStr },
          $unset: { classId: "" } // 기존 단일 classId 제거
        }
      );

      console.log(`   ✅ ${result.modifiedCount}명의 학생 classIds 업데이트`);
      updatedCount += result.modifiedCount;
    }

    console.log(`\n🎉 완료! 총 ${updatedCount}명의 학생 데이터 동기화`);

    // 검증: 동기화된 데이터 확인
    console.log('\n🔍 동기화 결과 검증...');
    for (const cls of classes) {
      if (!cls.studentIds || cls.studentIds.length === 0) continue;

      const students = await db.collection('users').find({
        _id: { $in: cls.studentIds.map((id: any) => typeof id === 'string' ? id : id.toString()) },
        role: 'student'
      }).toArray();

      console.log(`\n클래스: ${cls.name}`);
      for (const student of students) {
        const hasClass = student.classIds?.includes(cls._id.toString());
        console.log(`  - ${student.name} (${student.studentNumber}): ${hasClass ? '✅' : '❌'} classIds 포함`);
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

syncClassStudents();

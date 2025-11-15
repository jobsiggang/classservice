# API 테스트 가이드

## 🧪 테스트 순서

### 1. 학교 생성 및 Admin 계정 발급

```bash
curl -X POST http://localhost:3002/api/user/schools \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "서울고등학교",
    "adminName": "관리자",
    "adminEmail": "admin@school.com",
    "adminPassword": "Admin123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "schoolId": "school_abc123...",
    "schoolName": "서울고등학교",
    "admin": {
      "id": "65f...",
      "name": "관리자",
      "email": "admin@school.com"
    }
  }
}
```

**📝 `schoolId`를 저장하세요!**

---

### 2. Admin 로그인

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "Admin123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": { ... }
  }
}
```

**📝 `accessToken`을 저장하세요!**

---

### 3. 교사 초대

```bash
curl -X POST http://localhost:3002/api/user/schools/school_abc123.../invite-teacher \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "김선생",
    "email": "teacher@school.com",
    "password": "Teacher123!"
  }'
```

---

### 4. 교사 로그인

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@school.com",
    "password": "Teacher123!"
  }'
```

---

### 5. 학급 생성

```bash
curl -X POST http://localhost:3002/api/user/classes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "name": "3학년 1반",
    "grade": "3"
  }'
```

**📝 `classId`를 저장하세요!**

---

### 6. 학생 등록

```bash
curl -X POST http://localhost:3002/api/user/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "name": "홍길동",
    "email": "student@school.com",
    "password": "Student123!",
    "classId": "CLASS_ID"
  }'
```

---

### 7. 과제 생성

```bash
curl -X POST http://localhost:3003/api/assignment/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "title": "수학 과제 1",
    "description": "1-10번 문제 풀이",
    "classId": "CLASS_ID",
    "dueDate": "2025-12-31T23:59:59Z"
  }'
```

**📝 `assignmentId`를 저장하세요!**

---

### 8. 학생 로그인

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.com",
    "password": "Student123!"
  }'
```

---

### 9. 파일 업로드

```bash
curl -X POST http://localhost:3004/api/file/upload \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -F "file=@/path/to/your/file.pdf"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "abc123def456",
    "url": "https://...",
    ...
  }
}
```

**📝 `fileId`를 저장하세요!**

---

### 10. 과제 제출

```bash
curl -X POST http://localhost:3003/api/assignment/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -d '{
    "assignmentId": "ASSIGNMENT_ID",
    "content": "과제를 완료했습니다",
    "fileIds": ["FILE_ID"]
  }'
```

---

### 11. 제출물 목록 조회 (교사)

```bash
curl -X GET http://localhost:3003/api/assignment/submissions/assignment/ASSIGNMENT_ID \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

---

### 12. 피드백 추가 (교사)

```bash
curl -X PATCH http://localhost:3003/api/assignment/submissions/SUBMISSION_ID/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -d '{
    "feedback": "잘했습니다!",
    "grade": 95
  }'
```

---

## 🔄 WebSocket 테스트

### JavaScript 예제:

```javascript
// 학생이 WebSocket 연결
const ws = new WebSocket('ws://localhost:3005/ws?token=STUDENT_ACCESS_TOKEN');

ws.onopen = () => {
  console.log('✅ Connected to real-time service');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Received:', data);
  
  if (data.type === 'assignment.created') {
    alert(`새로운 과제: ${data.data.title}`);
  }
  
  if (data.type === 'submission.graded') {
    alert(`과제 피드백: ${data.data.feedback}`);
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('🔌 Disconnected');
};
```

---

## 🧰 Postman Collection

API를 Postman에서 테스트하려면:

1. Postman 열기
2. Import → Raw text
3. 아래 JSON 붙여넣기:

```json
{
  "info": {
    "name": "FairProject API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@school.com\",\n  \"password\": \"Admin123!\"\n}"
            },
            "url": {
              "raw": "http://localhost:3001/api/auth/login",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3001",
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 💡 팁

1. **환경 변수 사용**: Postman에서 `{{token}}`, `{{schoolId}}` 등으로 저장
2. **순서 지키기**: 학교 생성 → 로그인 → 교사/학생 등록 순서
3. **토큰 만료**: Access Token은 1일 후 만료, Refresh Token으로 갱신
4. **WebSocket**: 브라우저 개발자 도구에서 테스트 가능

---

## 🐛 문제 해결

### 401 Unauthorized
- 토큰이 없거나 만료됨
- `/api/auth/refresh`로 갱신

### 403 Forbidden
- 권한이 없음 (예: Student가 과제 생성 시도)
- 올바른 role의 사용자로 로그인

### 404 Not Found
- 잘못된 ID 사용
- schoolId, classId, assignmentId 확인

### WebSocket 연결 실패
- 토큰을 쿼리 파라미터로 전달했는지 확인
- `ws://localhost:3005/ws?token=YOUR_TOKEN`

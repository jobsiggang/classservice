# 🎯 FairProject - Domain-based Microservice Architecture

교육 플랫폼을 위한 마이크로서비스 아키텍처 구현

## 📋 목차

- [아키텍처 개요](#아키텍처-개요)
- [서비스 구성](#서비스-구성)
- [설치 및 실행](#설치-및-실행)
- [API 문서](#api-문서)
- [데이터베이스 구조](#데이터베이스-구조)
- [환경 변수 설정](#환경-변수-설정)

---

## 🏗️ 아키텍처 개요

```
┌──────────────────────────────────┐
│            Frontend              │
│  Student UI / Teacher UI / Admin │
└───────────────▲──────────────────┘
                │ HTTPS
  ┌─────────────┼──────────────┐
  │              │              │
┌─┴──────────┐  ┌┴────────────┐  ┌──┴──────────────┐
│   Auth     │  │    User     │  │   Assignment   │
│  Service   │  │   Service   │  │    Service     │
│ :3001      │  │   :3002     │  │     :3003      │
└────────────┘  └─────────────┘  └────────────────┘
       │               │                   │
       └───────────────┼───────────────────┘
                       │
            ┌──────────▼──────────┐
            │      MongoDB        │
            │  (Multi-tenant DB)  │
            └──────────┬──────────┘
                       │ Change Stream
            ┌──────────▼──────────┐
            │    Real-time Sv.    │
            │  (WebSocket :3005)  │
            └─────────────────────┘

            ┌─────────────────────┐
            │    File Service     │
            │   (S3/AWS :3004)    │
            └─────────────────────┘
```

---

## 🚀 서비스 구성

### 1️⃣ Auth Service (포트: 3001)
**역할**: 인증 및 권한 관리
- ✅ 회원가입/로그인
- ✅ JWT 발급 및 갱신
- ✅ 학교 생성 시 Admin 계정 자동 발급
- ✅ 권한(Role) 확인 API

**기술 스택**: Node.js, Express, JWT, bcrypt

### 2️⃣ User Service (포트: 3002)
**역할**: 학교, 학급, 학생 관리
- ✅ 학교 생성 및 설정
- ✅ 교사 초대 및 등록
- ✅ 학급(Class) 생성 및 관리
- ✅ 학생 등록 및 관리

**기술 스택**: Node.js, Express, MongoDB

### 3️⃣ Assignment Service (포트: 3003)
**역할**: 과제 및 제출물 관리 (핵심 기능)
- ✅ 과제 CRUD (Teacher)
- ✅ 과제 제출 (Student)
- ✅ 피드백 및 점수 관리
- ✅ 댓글 기능
- ✅ 파일 ID 연동

**기술 스택**: Node.js, Express, MongoDB

### 4️⃣ File Service (포트: 3004)
**역할**: 파일 업로드 전용 서비스
- ✅ 이미지, PDF, 문서 업로드
- ✅ AWS S3 연동 (프로덕션)
- ✅ 파일 메타데이터 관리
- ✅ 파일 ID 반환 (다른 서비스에서 사용)

**기술 스택**: Node.js, Express, Multer, AWS S3

### 5️⃣ Real-time Event Service (포트: 3005)
**역할**: 실시간 알림 및 동기화
- ✅ WebSocket 서버
- ✅ MongoDB Change Stream 감지
- ✅ 실시간 푸시 알림
- ✅ 과제 생성, 제출 시 즉시 알림

**기술 스택**: Node.js, WebSocket (ws), MongoDB Change Streams

---

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18+ 
- MongoDB 6.0+ (Replica Set 필수 - Change Stream 사용)
- AWS 계정 (S3 사용 시)

### 1단계: 패키지 설치

```bash
cd services
npm install
```

### 2단계: 환경 변수 설정

`.env.example`을 `.env`로 복사하고 값을 설정합니다:

```bash
cp .env.example .env
```

### 3단계: MongoDB Replica Set 설정

Change Stream을 사용하려면 MongoDB Replica Set이 필요합니다:

```bash
# Docker를 사용하는 경우
docker run -d -p 27017:27017 --name mongodb mongo:6 --replSet rs0
docker exec -it mongodb mongosh --eval "rs.initiate()"
```

### 4단계: 서비스 실행

#### 모든 서비스 동시 실행
```bash
npm run dev:all
```

#### 개별 서비스 실행
```bash
npm run dev:auth        # Auth Service :3001
npm run dev:user        # User Service :3002
npm run dev:assignment  # Assignment Service :3003
npm run dev:file        # File Service :3004
npm run dev:realtime    # Real-time Service :3005
```

---

## 📚 API 문서

### Auth Service (http://localhost:3001)

#### POST `/api/auth/register`
회원가입

```json
{
  "name": "홍길동",
  "email": "hong@example.com",
  "password": "Password123!",
  "role": "student",
  "schoolId": "school_xxx123"
}
```

#### POST `/api/auth/login`
로그인

```json
{
  "email": "hong@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "...",
      "name": "홍길동",
      "email": "hong@example.com",
      "role": "student",
      "schoolId": "school_xxx123"
    }
  }
}
```

#### POST `/api/auth/refresh`
토큰 갱신

```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### GET `/api/auth/me`
내 정보 조회 (인증 필요)

**Headers:** `Authorization: Bearer {accessToken}`

---

### User Service (http://localhost:3002)

#### POST `/api/user/schools`
학교 생성 + Admin 계정 자동 발급

```json
{
  "schoolName": "서울고등학교",
  "adminName": "관리자",
  "adminEmail": "admin@school.com",
  "adminPassword": "Admin123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "schoolId": "school_abc123def456",
    "schoolName": "서울고등학교",
    "admin": {
      "id": "...",
      "name": "관리자",
      "email": "admin@school.com"
    }
  }
}
```

#### POST `/api/user/schools/:schoolId/invite-teacher`
교사 초대 (Admin만)

**Headers:** `Authorization: Bearer {accessToken}`

```json
{
  "name": "김선생",
  "email": "teacher@school.com",
  "password": "Teacher123!"
}
```

#### POST `/api/user/classes`
학급 생성 (Admin/Teacher)

**Headers:** `Authorization: Bearer {accessToken}`

```json
{
  "name": "3학년 1반",
  "grade": "3"
}
```

#### POST `/api/user/students`
학생 등록 (Admin/Teacher)

**Headers:** `Authorization: Bearer {accessToken}`

```json
{
  "name": "학생이름",
  "email": "student@school.com",
  "password": "Student123!",
  "classId": "65f..."
}
```

---

### Assignment Service (http://localhost:3003)

#### POST `/api/assignment/assignments`
과제 생성 (Teacher만)

**Headers:** `Authorization: Bearer {accessToken}`

```json
{
  "title": "수학 과제 1",
  "description": "1-10번 문제 풀이",
  "classId": "65f...",
  "dueDate": "2025-12-31T23:59:59Z",
  "fileIds": ["file_abc123"]
}
```

#### GET `/api/assignment/assignments`
과제 목록 조회

**Headers:** `Authorization: Bearer {accessToken}`

**Query:** `?classId=65f...`

#### POST `/api/assignment/submissions`
과제 제출 (Student만)

**Headers:** `Authorization: Bearer {accessToken}`

```json
{
  "assignmentId": "65f...",
  "content": "과제 내용",
  "fileIds": ["file_xyz789"]
}
```

#### PATCH `/api/assignment/submissions/:submissionId/feedback`
피드백 추가 (Teacher만)

**Headers:** `Authorization: Bearer {accessToken}`

```json
{
  "feedback": "잘했습니다!",
  "grade": 95
}
```

---

### File Service (http://localhost:3004)

#### POST `/api/file/upload`
파일 업로드

**Headers:** 
- `Authorization: Bearer {accessToken}`
- `Content-Type: multipart/form-data`

**Body (form-data):**
- `file`: (파일)

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "abc123def456",
    "url": "https://...",
    "originalName": "document.pdf",
    "mimeType": "application/pdf",
    "size": 102400
  }
}
```

#### POST `/api/file/upload/multiple`
다중 파일 업로드

**Body (form-data):**
- `files`: (파일 배열, 최대 5개)

---

### Real-time Service (ws://localhost:3005)

#### WebSocket 연결

```javascript
const ws = new WebSocket('ws://localhost:3005/ws?token=YOUR_ACCESS_TOKEN');

ws.onopen = () => {
  console.log('Connected to real-time service');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  // data.type 종류:
  // - assignment.created
  // - assignment.updated
  // - submission.created
  // - submission.graded
  // - class.created
  // - notification
};
```

---

## 🗄️ 데이터베이스 구조

### Collections

```
fairproject (Database)
├── users              # 모든 사용자 (admin, teacher, student)
├── schools            # 학교 정보
├── classes            # 학급 정보
├── assignments        # 과제
├── submissions        # 제출물
└── files              # 파일 메타데이터
```

### Multi-tenant 구조

모든 문서에 `schoolId` 필드 포함:

```json
{
  "_id": "...",
  "schoolId": "school_abc123",
  // ... 기타 필드
}
```

---

## 🔐 환경 변수 설정

`.env` 파일:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/fairproject
DB_NAME=fairproject

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Service Ports
AUTH_PORT=3001
USER_PORT=3002
ASSIGNMENT_PORT=3003
FILE_PORT=3004
REALTIME_PORT=3005

# AWS S3 (File Service)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=fairproject-uploads

# CORS
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=development
```

---

## 🎯 주요 기능

### ✅ 멀티테넌트 아키텍처
- 단일 DB에서 `schoolId`로 데이터 분리
- 학교별 완전한 데이터 격리

### ✅ 역할 기반 접근 제어 (RBAC)
- Admin: 학교 전체 관리
- Teacher: 과제/학급 관리
- Student: 과제 제출 및 조회

### ✅ 실시간 알림
- MongoDB Change Stream으로 변경 감지
- WebSocket으로 실시간 푸시
- 과제 생성/제출 시 즉시 알림

### ✅ 파일 관리
- AWS S3 연동
- 10MB 파일 크기 제한
- 이미지, PDF, 문서 지원

### ✅ JWT 인증
- Access Token (1일)
- Refresh Token (7일)
- 토큰 갱신 기능

---

## 🛠️ 개발 권장 순서

1. ✅ **Auth Service** - 인증 기반 구축
2. ✅ **User Service** - 학교/학급/학생 관리
3. ✅ **Assignment Service** - 핵심 비즈니스 로직
4. ✅ **File Service** - 파일 업로드 독립화
5. ✅ **Real-time Service** - 실시간 기능 추가

---

## 📝 프로덕션 체크리스트

- [ ] MongoDB Replica Set 설정
- [ ] AWS S3 버킷 생성 및 권한 설정
- [ ] 환경 변수 보안 강화
- [ ] HTTPS/WSS 적용
- [ ] Rate Limiting 설정
- [ ] 로깅 및 모니터링 (winston, datadog 등)
- [ ] Docker/Kubernetes 배포 설정
- [ ] API Gateway 설정 (선택)
- [ ] 데이터베이스 백업 정책

---

## 🤝 기여

이 프로젝트는 교육용 마이크로서비스 아키텍처 예제입니다.

---

## 📄 라이선스

ISC

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
#   c l a s s s e r v i c e  
 
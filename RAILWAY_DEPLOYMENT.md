# Railway 배포 가이드

## 🚨 중요: MongoDB SSL 오류 해결

Railway에서 MongoDB Atlas 연결 시 SSL/TLS 오류가 발생할 수 있습니다.
이미 `shared/utils/mongodb.ts`에 TLS 설정이 추가되어 있습니다.

## Railway 환경 변수 설정

각 서비스마다 다음 환경 변수를 설정하세요:

### 공통 환경 변수 (모든 서비스)

```bash
# MongoDB
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority&tls=true
DB_NAME=fairproject

# JWT
JWT_SECRET=lB6#@=HUfen*MTWVSg-Yrzak18ZQhc7qJOmtL$boCPX%d?IswN2j0GDAEvyp3i&!
JWT_REFRESH_SECRET=7uPyrmD5No&WtH9nFVdp%+X*!KZv2EcBfkOx1@qARSb#i3gzUwhJ6YslQ?Ij0eL
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=production
```

### Auth Service (추가)

```bash
AUTH_PORT=3001
```

### User Service (추가)

```bash
USER_PORT=3002
```

### Assignment Service (추가)

```bash
ASSIGNMENT_PORT=3003
```

### File Service (추가)

```bash
FILE_PORT=3004

# Google Drive (과제 제출용)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

### Realtime Service (추가)

```bash
REALTIME_PORT=3005
```

## 배포 순서

### 1. Git Push
```bash
git add .
git commit -m "Fix MongoDB SSL connection for Railway deployment"
git push
```

### 2. Railway 프로젝트 생성

각 서비스마다 별도 프로젝트 생성:
- `fairproject-auth`
- `fairproject-user`
- `fairproject-assignment`
- `fairproject-file`
- `fairproject-realtime`

### 3. 각 서비스 배포 설정

#### Auth Service
```bash
# Root Directory: /
# Build Command: npm run build
# Start Command: npm start
# Dockerfile: Dockerfile.auth
```

#### User Service
```bash
# Dockerfile: Dockerfile.user
```

#### Assignment Service
```bash
# Dockerfile: Dockerfile.assignment
```

#### File Service
```bash
# Dockerfile: Dockerfile.file
```

#### Realtime Service
```bash
# Dockerfile: Dockerfile.realtime
```

### 4. 환경 변수 설정

Railway 대시보드에서 각 서비스의 Variables 탭에서 설정

### 5. 배포 확인

```bash
# Auth Service 헬스체크
curl https://your-auth-service.railway.app/api/health

# User Service 헬스체크
curl https://your-user-service.railway.app/api/health
```

## MongoDB Atlas 네트워크 접근 설정

1. MongoDB Atlas 대시보드 → Network Access
2. **Add IP Address** 클릭
3. **Allow Access from Anywhere** 선택 (0.0.0.0/0)
   - 또는 Railway IP 범위만 허용하려면 Railway 문서 참고

## 트러블슈팅

### SSL/TLS 오류
```
MongoServerSelectionError: SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

**해결방법:**
1. `shared/utils/mongodb.ts`에 TLS 옵션 추가 (이미 완료)
2. MongoDB URI에 `&tls=true` 파라미터 추가
3. MongoDB Atlas Network Access에서 Railway IP 허용

### 연결 타임아웃
```
MongoServerSelectionError: Server selection timeout
```

**해결방법:**
1. MongoDB Atlas Network Access 확인
2. MONGODB_URI 환경 변수 확인
3. `serverSelectionTimeoutMS` 증가 (현재 30초)

### 환경 변수 누락
```
Cannot read property of undefined
```

**해결방법:**
Railway Variables 탭에서 모든 환경 변수 설정 확인

## 로컬 테스트

배포 전 로컬에서 프로덕션 모드 테스트:

```bash
# 빌드
npm run build

# 프로덕션 모드 실행
NODE_ENV=production npm start
```

## CORS 설정

프론트엔드 도메인을 각 서비스의 환경 변수에 추가:

```bash
CORS_ORIGIN=https://your-frontend-domain.com
```

## 도메인 설정 (선택사항)

Railway에서 커스텀 도메인 설정:
- auth.yourdomain.com → Auth Service
- api.yourdomain.com → User Service
- files.yourdomain.com → File Service
- ws.yourdomain.com → Realtime Service

## 비용 절감 팁

1. **자동 스케일링**: Railway는 트래픽에 따라 자동 조정
2. **Sleep 모드**: 비활성 서비스는 자동으로 슬립
3. **로그 제한**: 과도한 로깅 제거
4. **MongoDB 최적화**: 인덱스 설정, 불필요한 쿼리 제거

## 모니터링

Railway 대시보드에서 확인:
- CPU/메모리 사용량
- 요청 수
- 에러 로그
- 배포 히스토리

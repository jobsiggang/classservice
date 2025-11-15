# 🚀 Vercel 배포 가이드

## 📋 배포 전 준비사항

### 1. MongoDB Atlas 설정
1. https://www.mongodb.com/cloud/atlas 접속 및 가입
2. **무료 클러스터 생성** (M0)
3. **Database Access** → 사용자 생성
4. **Network Access** → `0.0.0.0/0` 허용
5. **연결 문자열 복사**:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/fairschool?retryWrites=true&w=majority
   ```

### 2. AWS S3 설정 (File Service용)
1. AWS 계정 생성
2. S3 버킷 생성 (예: `fairschool-files`)
3. IAM 사용자 생성 및 S3 권한 부여
4. Access Key 발급

---

## 🌐 Vercel 배포 단계

### 1단계: GitHub에 푸시

```bash
# Git 초기화 (아직 안했다면)
git init
git add .
git commit -m "Ready for Vercel deployment"

# GitHub 저장소 연결
git remote add origin https://github.com/jobsiggang/classservice.git
git branch -M main
git push -u origin main
```

### 2단계: Vercel 프로젝트 생성

#### 방법 A: Vercel CLI (추천)

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 배포
vercel

# 질문에 대답:
# Set up and deploy? Yes
# Which scope? (본인 계정 선택)
# Link to existing project? No
# What's your project's name? fairschool-api
# In which directory is your code located? ./
# Want to override the settings? No

# 프로덕션 배포
vercel --prod
```

#### 방법 B: Vercel 웹사이트

1. https://vercel.com 접속 및 GitHub 로그인
2. **"New Project"** 클릭
3. **GitHub 저장소 선택**: `jobsiggang/classservice`
4. **Framework Preset**: Other
5. **Root Directory**: `./`
6. **Deploy** 클릭

---

### 3단계: 환경변수 설정

Vercel 대시보드에서:

1. **Settings** → **Environment Variables** 이동
2. 다음 변수들 추가:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fairschool?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too-min-32-chars

# AWS S3 (File Service용)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=fairschool-files

# Node 환경
NODE_ENV=production
```

**주의**: Production, Preview, Development 모두 체크!

---

### 4단계: Super Admin 계정 생성

배포 후 한 번만 실행:

```bash
# 로컬에서 프로덕션 DB에 연결하여 시드 실행
MONGODB_URI="your-production-mongodb-uri" npm run seed:superadmin
```

또는 Vercel에서 직접:

```bash
# Vercel CLI로 환경변수와 함께 실행
vercel env pull .env.production
npm run seed:superadmin
```

**생성되는 계정**:
- Email: `superadmin@fairschool.kr`
- Password: `SuperAdmin123!`
- Role: `superadmin`

---

## 🌍 배포 후 엔드포인트

배포 완료 후 Vercel이 제공하는 URL (예: `fairschool-api.vercel.app`):

### Auth API
```
POST https://fairschool-api.vercel.app/api/auth/login
POST https://fairschool-api.vercel.app/api/auth/register
POST https://fairschool-api.vercel.app/api/auth/refresh
GET  https://fairschool-api.vercel.app/api/auth/me
```

### User API (School Management)
```
GET  https://fairschool-api.vercel.app/api/user/school (Super Admin)
POST https://fairschool-api.vercel.app/api/user/school (Super Admin)
```

### Health Check
```
GET https://fairschool-api.vercel.app/api/health
```

---

## 🧪 배포 테스트

### 1. Health Check
```bash
curl https://fairschool-api.vercel.app/api/health
```

**예상 응답**:
```json
{
  "status": "OK",
  "service": "FairSchool API",
  "timestamp": "2025-11-15T..."
}
```

### 2. Super Admin 로그인
```bash
curl -X POST https://fairschool-api.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@fairschool.kr",
    "password": "SuperAdmin123!"
  }'
```

**예상 응답**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "superadmin@fairschool.kr",
    "name": "Super Administrator",
    "role": "superadmin"
  }
}
```

### 3. 학교 생성 (Super Admin 토큰 필요)
```bash
curl -X POST https://fairschool-api.vercel.app/api/user/school \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "테스트 학교",
    "adminEmail": "admin@testschool.kr",
    "adminName": "학교 관리자",
    "adminPassword": "Admin123!"
  }'
```

---

## 🔧 커스텀 도메인 설정 (선택사항)

### Vercel에서 도메인 추가:

1. **Settings** → **Domains**
2. 도메인 입력: `api.fairschool.kr`
3. DNS 레코드 추가:
   ```
   Type: CNAME
   Name: api
   Value: cname.vercel-dns.com
   ```

### 서브도메인 구조:
- `admin.fairschool.kr` → Super Admin 대시보드 (Frontend)
- `api.fairschool.kr` → API Backend (Vercel)
- `{schoolId}.fairschool.kr` → 각 학교 대시보드 (Frontend)

---

## 📊 모니터링

### Vercel 대시보드:
- **Deployments**: 배포 이력
- **Functions**: 함수 실행 로그
- **Analytics**: API 호출 통계
- **Logs**: 실시간 로그 확인

### 로그 확인:
```bash
# Vercel CLI로 실시간 로그
vercel logs
```

---

## 🚨 트러블슈팅

### 1. "Module not found" 에러
```bash
# package.json에 모든 의존성 확인
npm install --save @vercel/node
```

### 2. MongoDB 연결 실패
- MongoDB Atlas Network Access에 `0.0.0.0/0` 추가 확인
- 연결 문자열 형식 확인
- 비밀번호 특수문자 URL 인코딩 확인

### 3. CORS 에러
- 각 API 파일에 CORS 헤더 설정 확인
- `vercel.json`에 추가:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### 4. 환경변수 적용 안됨
```bash
# 재배포
vercel --prod --force
```

---

## 🎯 다음 단계

1. ✅ **API 배포 완료**
2. ⏳ **Frontend 개발**:
   - Next.js로 Super Admin 대시보드
   - 학교별 서브도메인 설정
   - 교사/학생 대시보드
3. ⏳ **WebSocket 서비스**:
   - Railway/Render에 별도 배포
   - `wss://realtime.fairschool.kr`

---

## 💰 비용 예상

### Vercel:
- **Free Plan**: 100GB 대역폭/월, 100,000 함수 호출/월
- **Hobby Plan**: $20/월 (무제한)

### MongoDB Atlas:
- **Free Tier**: 512MB 저장소 (충분함)
- **M10**: $0.08/시간 ($57/월)

### AWS S3:
- **첫 5GB**: 무료
- **이후**: $0.023/GB

**예상 초기 비용**: 무료 (Free Tier 활용)

---

## 📞 도움말

문제가 생기면:
1. Vercel 로그 확인: `vercel logs`
2. MongoDB Atlas 모니터링 확인
3. GitHub Issues 생성

배포 완료되면 URL을 공유해주세요!

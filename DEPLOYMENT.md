# 🚀 배포 가이드

현재 마이크로서비스 구조를 그대로 배포하는 방법들입니다.

---

## 방법 1: Railway (추천) ⭐⭐⭐

**장점:**
- 무료 플랜: $5 크레딧/월 (취미 프로젝트 충분)
- 자동 HTTPS
- 환경변수 관리 간편
- GitHub 연동 자동 배포
- 각 서비스별 독립 배포

**배포 단계:**

### 1️⃣ Railway 가입 및 프로젝트 생성
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 새 프로젝트 생성
railway init
```

### 2️⃣ MongoDB Atlas 설정
1. https://www.mongodb.com/cloud/atlas 가입
2. 무료 클러스터 생성 (M0)
3. Database Access에서 사용자 생성
4. Network Access에서 `0.0.0.0/0` 허용
5. 연결 문자열 복사

### 3️⃣ Railway에서 각 서비스 배포

**Auth Service 배포:**
```bash
# Railway 프로젝트에 서비스 추가
railway service create auth

# 환경변수 설정
railway variables set PORT=3001
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-super-secret-key-change-in-production"
railway variables set JWT_REFRESH_SECRET="your-refresh-secret-key"
railway variables set NODE_ENV=production

# 시작 명령어 설정
railway service update --start-command "npm run build && node dist/auth/server.js"

# 배포
railway up
```

**User Service 배포:**
```bash
railway service create user
railway variables set PORT=3002
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-super-secret-key-change-in-production"
railway variables set NODE_ENV=production
railway service update --start-command "npm run build && node dist/user/server.js"
railway up
```

**Assignment Service 배포:**
```bash
railway service create assignment
railway variables set PORT=3003
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-super-secret-key-change-in-production"
railway variables set NODE_ENV=production
railway service update --start-command "npm run build && node dist/assignment/server.js"
railway up
```

**File Service 배포:**
```bash
railway service create file
railway variables set PORT=3004
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-super-secret-key-change-in-production"
railway variables set AWS_ACCESS_KEY_ID="your-aws-key"
railway variables set AWS_SECRET_ACCESS_KEY="your-aws-secret"
railway variables set AWS_REGION="ap-northeast-2"
railway variables set AWS_S3_BUCKET="your-bucket-name"
railway variables set NODE_ENV=production
railway service update --start-command "npm run build && node dist/file/server.js"
railway up
```

**Realtime Service 배포:**
```bash
railway service create realtime
railway variables set PORT=3005
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-super-secret-key-change-in-production"
railway variables set NODE_ENV=production
railway service update --start-command "npm run build && node dist/realtime/server.js"
railway up
```

### 4️⃣ 도메인 설정
각 서비스에 Railway가 자동으로 도메인을 부여합니다:
- `auth-production.up.railway.app`
- `user-production.up.railway.app`
- `assignment-production.up.railway.app`
- `file-production.up.railway.app`
- `realtime-production.up.railway.app`

또는 커스텀 도메인 설정:
```bash
railway domain add auth.fairschool.kr
railway domain add user.fairschool.kr
railway domain add assignment.fairschool.kr
railway domain add file.fairschool.kr
railway domain add realtime.fairschool.kr
```

---

## 방법 2: Render ⭐⭐

**장점:**
- 무료 플랜 제공 (단, 15분 비활성시 슬립)
- 자동 HTTPS
- GitHub 연동 자동 배포

**배포 단계:**

### 1️⃣ GitHub 푸시
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2️⃣ Render에서 각 서비스 생성
1. https://render.com 가입
2. "New +" → "Web Service" 클릭
3. GitHub 저장소 연결
4. 각 서비스별로 설정:

**Auth Service:**
- Name: `fairschool-auth`
- Build Command: `npm install && npm run build`
- Start Command: `node dist/auth/server.js`
- Environment Variables:
  - `PORT`: `3001`
  - `MONGODB_URI`: `mongodb+srv://...`
  - `JWT_SECRET`: `your-secret-key`
  - `NODE_ENV`: `production`

**나머지 서비스도 동일하게 반복**

### 3️⃣ render.yaml로 한번에 배포 (선택사항)
```yaml
services:
  - type: web
    name: fairschool-auth
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/auth/server.js
    envVars:
      - key: PORT
        value: 3001
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production

  - type: web
    name: fairschool-user
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/user/server.js
    envVars:
      - key: PORT
        value: 3002
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: NODE_ENV
        value: production

  # ... 나머지 서비스들
```

---

## 방법 3: Docker + Fly.io ⭐⭐

**장점:**
- 완전한 컨테이너 제어
- 무료 플랜 제공
- 글로벌 배포 가능

### 1️⃣ Dockerfile 사용 (이미 생성됨)
```bash
# Fly CLI 설치
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# 로그인
fly auth login

# 각 서비스별 앱 생성
fly launch --name fairschool-auth --dockerfile Dockerfile.auth --no-deploy
fly launch --name fairschool-user --dockerfile Dockerfile.user --no-deploy
fly launch --name fairschool-assignment --dockerfile Dockerfile.assignment --no-deploy
fly launch --name fairschool-file --dockerfile Dockerfile.file --no-deploy
fly launch --name fairschool-realtime --dockerfile Dockerfile.realtime --no-deploy

# 환경변수 설정
fly secrets set MONGODB_URI="..." JWT_SECRET="..." -a fairschool-auth
fly secrets set MONGODB_URI="..." JWT_SECRET="..." -a fairschool-user
# ... 반복

# 배포
fly deploy -a fairschool-auth
fly deploy -a fairschool-user
fly deploy -a fairschool-assignment
fly deploy -a fairschool-file
fly deploy -a fairschool-realtime
```

---

## 방법 4: AWS ECS (프로덕션 수준) ⭐

**장점:**
- 완전한 확장성
- AWS 생태계 통합
- 프로페셔널 레벨

**단점:**
- 복잡한 설정
- 유료 (프리티어 후)

**배포 단계:**
1. ECR에 Docker 이미지 푸시
2. ECS 클러스터 생성
3. 각 서비스별 태스크 정의
4. 로드밸런서 설정
5. Auto Scaling 설정

---

## 방법 5: Vercel + Railway 하이브리드 ⭐⭐

**추천 구성:**
- **API 서비스 (Auth, User, Assignment, File)** → Railway
- **Frontend (React/Next.js)** → Vercel
- **WebSocket (Realtime)** → Railway 별도 서비스
- **MongoDB** → MongoDB Atlas
- **파일 저장소** → AWS S3 / Cloudflare R2

---

## 🎯 추천 배포 전략

### 개발/테스트 단계:
→ **Railway** (무료, 간단)

### 프로덕션 단계:
→ **Railway + MongoDB Atlas** 또는 **Render**

### 대규모 서비스:
→ **AWS ECS + RDS + S3**

---

## 📋 배포 전 체크리스트

- [ ] MongoDB Atlas 클러스터 생성
- [ ] 환경변수 보안 설정 (JWT_SECRET 변경)
- [ ] AWS S3 버킷 생성 (File Service용)
- [ ] CORS 설정 (프론트엔드 도메인 허용)
- [ ] Rate Limiting 설정 확인
- [ ] Health Check 엔드포인트 테스트
- [ ] GitHub 저장소에 푸시
- [ ] .env 파일은 .gitignore에 포함 확인

---

## 🔗 유용한 링크

- Railway: https://railway.app
- Render: https://render.com
- Fly.io: https://fly.io
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- AWS S3: https://aws.amazon.com/s3/

---

## 💡 다음 단계

배포 방법을 선택하셨다면:
1. Super Admin 시드 데이터 생성 완료
2. 선택한 플랫폼에 배포
3. 프론트엔드 개발 및 연동
4. 도메인 설정 및 HTTPS 적용

어떤 방법으로 진행하시겠습니까?

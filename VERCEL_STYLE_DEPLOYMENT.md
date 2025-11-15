# Vercel 스타일로 Docker 배포하기 🚀

Docker를 Vercel처럼 자동 도메인으로 배포하는 가장 쉬운 방법입니다.

## 🎯 추천: Railway (가장 Vercel과 유사)

### 특징
- ✅ GitHub 푸시만 하면 자동 배포
- ✅ 각 서비스마다 `https://xxx.up.railway.app` 도메인 자동 생성
- ✅ 무료 $5 크레딧/월
- ✅ Docker 자동 인식
- ✅ 환경 변수 웹에서 관리

---

## 🚂 Railway 배포 (3분 완료)

### 1️⃣ Railway 가입
1. https://railway.app 접속
2. "Start a New Project" 클릭
3. GitHub으로 로그인

### 2️⃣ 프로젝트 생성
1. "Deploy from GitHub repo" 선택
2. `jobsiggang/classservice` 저장소 선택
3. "Deploy Now" 클릭

### 3️⃣ 서비스 5개 생성

Railway는 docker-compose.yml을 자동으로 인식하여 5개 서비스를 생성합니다:

- `auth` → https://auth-production-xxxx.up.railway.app
- `user` → https://user-production-xxxx.up.railway.app
- `assignment` → https://assignment-production-xxxx.up.railway.app
- `file` → https://file-production-xxxx.up.railway.app
- `realtime` → https://realtime-production-xxxx.up.railway.app

### 4️⃣ 환경 변수 설정

각 서비스마다 Variables 탭에서 설정:

```env
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority
JWT_SECRET=your-strong-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=fairproject-uploads
```

### 5️⃣ 배포 완료!

자동으로 배포되며, 각 서비스의 URL을 받습니다:

```
✅ https://auth-production-a1b2.up.railway.app/health
✅ https://user-production-c3d4.up.railway.app/health
✅ https://assignment-production-e5f6.up.railway.app/health
✅ https://file-production-g7h8.up.railway.app/health
✅ https://realtime-production-i9j0.up.railway.app/health
```

---

## 🎨 대안: Render (Railway 다음으로 쉬움)

### 1️⃣ Render 가입
1. https://render.com 접속
2. GitHub으로 로그인

### 2️⃣ Blueprint 배포
1. "New" → "Blueprint" 클릭
2. GitHub 저장소 연결: `jobsiggang/classservice`
3. `render.yaml` 파일이 자동으로 인식됨
4. "Apply" 클릭

### 3️⃣ 환경 변수 설정
각 서비스의 Environment 탭에서 설정

### 4️⃣ 배포 완료!
```
✅ https://auth-service-xxxx.onrender.com/health
✅ https://user-service-xxxx.onrender.com/health
✅ https://assignment-service-xxxx.onrender.com/health
✅ https://file-service-xxxx.onrender.com/health
✅ https://realtime-service-xxxx.onrender.com/health
```

---

## 💰 비용 비교

| 플랫폼 | 무료 플랜 | 유료 플랜 |
|--------|-----------|-----------|
| **Railway** | $5 크레딧/월 (충분함) | $20/월 |
| **Render** | 750시간/월 (무료) | $7/서비스/월 |
| **Vercel** | Docker 미지원 | - |

---

## 🔄 자동 배포 설정 (CI/CD)

### GitHub에 푸시하면 자동 배포

Railway/Render 모두 자동으로 설정됩니다:

```bash
git add .
git commit -m "Update services"
git push origin main
```

→ 자동으로 배포됨! 🚀

---

## 📝 지금 바로 시작하기

### Railway 배포 (추천)

1. **GitHub 푸시** (이미 완료)
   ```bash
   git add .
   git commit -m "Add Docker deployment config"
   git push origin main
   ```

2. **Railway 설정**
   - https://railway.app 접속
   - GitHub 저장소 연결
   - 환경 변수 설정
   - 배포 완료!

3. **테스트**
   ```bash
   # Railway에서 제공한 도메인으로
   curl https://auth-production-xxxx.up.railway.app/health
   ```

---

## 🎯 Railway vs Render 선택 가이드

### Railway 선택
- ✅ Vercel과 가장 유사한 경험
- ✅ 더 빠른 배포 속도
- ✅ 더 나은 UI/UX
- ✅ WebSocket 지원 우수

### Render 선택
- ✅ 무료 플랜이 더 관대함
- ✅ 더 많은 무료 시간
- ✅ Static site도 지원

---

## 📊 배포 후 확인

Railway/Render 대시보드에서:
- ✅ 로그 실시간 확인
- ✅ 리소스 사용량 모니터링
- ✅ 환경 변수 관리
- ✅ 커스텀 도메인 연결 가능

---

## 🔗 API 엔드포인트

배포 후 프론트엔드에서 사용할 주소:

```javascript
// config.js
const API_BASE = {
  auth: 'https://auth-production-xxxx.up.railway.app',
  user: 'https://user-production-xxxx.up.railway.app',
  assignment: 'https://assignment-production-xxxx.up.railway.app',
  file: 'https://file-production-xxxx.up.railway.app',
  realtime: 'wss://realtime-production-xxxx.up.railway.app'
};
```

---

## ⚡ 빠른 시작

**지금 바로 Railway로 배포:**

1. https://railway.app 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. `classservice` 선택
5. 환경 변수 입력
6. 완료! 🎉

**5분이면 끝납니다!**

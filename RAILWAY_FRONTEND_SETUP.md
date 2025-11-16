# Railway 배포 후 프론트엔드 설정 가이드

## 🚀 문제 상황

Railway에 배포 후 로그인이 안 되는 이유: 프론트엔드가 `localhost:3001` 등 로컬 URL을 사용하고 있음

## ✅ 해결 방법

### 1단계: Railway 서비스 URL 확인

Railway 대시보드에서 각 서비스의 **Settings** → **Networking** → **Public Networking**에서 도메인 확인:

예시:
```
Auth Service: https://fairschool-auth-production.up.railway.app
User Service: https://fairschool-user-production.up.railway.app
Assignment Service: https://fairschool-assignment-production.up.railway.app
File Service: https://fairschool-file-production.up.railway.app
```

### 2단계: config.js 파일 수정

`public/config.js` 파일을 열고 Railway URL로 업데이트:

```javascript
// Railway 서비스 URL 설정
window.RAILWAY_AUTH_URL = 'https://fairschool-auth-production.up.railway.app/api/auth';
window.RAILWAY_USER_URL = 'https://fairschool-user-production.up.railway.app/api/user';
window.RAILWAY_ASSIGNMENT_URL = 'https://fairschool-assignment-production.up.railway.app/api/assignment';
window.RAILWAY_FILE_URL = 'https://fairschool-file-production.up.railway.app/api/file';
```

**중요:** `/api/auth`, `/api/user` 등 경로까지 포함!

### 3단계: CORS 설정

각 서비스(Auth, User, Assignment, File)의 Railway 환경 변수에 추가:

```bash
CORS_ORIGIN=https://fairschool.up.railway.app
```

또는 모든 도메인 허용 (개발/테스트용):

```bash
CORS_ORIGIN=*
```

### 4단계: Git Push 및 재배포

```bash
git add public/config.js public/app.js public/index.html
git commit -m "Configure Railway service URLs for production"
git push
```

Railway가 자동으로 재배포합니다.

---

## 🔍 빠른 설정 (임시)

Railway URL을 모르는 경우, 일단 모든 origin 허용:

**각 서비스 환경 변수:**
```bash
CORS_ORIGIN=*
```

그 다음 Railway 대시보드에서 URL 확인 후 `config.js` 업데이트

---

## 🧪 테스트

1. https://fairschool.up.railway.app 접속
2. 브라우저 개발자 도구 → Console 확인
3. API 요청이 Railway URL로 가는지 확인:
   ```
   POST https://your-auth-service.up.railway.app/api/auth/login
   ```

---

## 💡 로컬 개발

로컬에서는 자동으로 `localhost` 사용:
- `localhost`, `127.0.0.1`에서 접속 시 → `http://localhost:3001` 등 사용
- 그 외 도메인 → Railway URL 사용

---

## ⚠️ 주의사항

### 1. HTTPS 필수
Railway는 기본적으로 HTTPS를 제공합니다. HTTP로 호출하지 마세요.

### 2. 도메인 끝에 슬래시(/) 없음
❌ `https://service.railway.app/api/auth/`
✅ `https://service.railway.app/api/auth`

### 3. 각 서비스마다 CORS 설정
5개 서비스 모두에 `CORS_ORIGIN` 환경 변수 추가해야 합니다!

---

## 🔧 문제 해결

### "blocked by CORS policy" 오류
→ 각 서비스에 `CORS_ORIGIN` 환경 변수 추가 후 재배포

### "net::ERR_NAME_NOT_RESOLVED"
→ `config.js`의 URL이 잘못됨. Railway 대시보드에서 정확한 URL 확인

### 여전히 localhost로 요청
→ 브라우저 캐시 삭제 (Ctrl+Shift+Delete) 후 Hard Refresh (Ctrl+Shift+R)

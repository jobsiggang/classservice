# Railway 환경 변수 설정 가이드

## ⚠️ 중요: 각 서비스마다 설정 필요!

Railway에서 5개 서비스를 배포한 경우, **각 서비스마다** 환경 변수를 개별적으로 설정해야 합니다.

---

## 🔧 Auth Service 환경 변수

Railway Dashboard → Auth Service → Variables 탭에서 추가:

```
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority
DB_NAME=fairproject
JWT_SECRET=lB6#@=HUfen*MTWVSg-Yrzak18ZQhc7qJOmtL$boCPX%d?IswN2j0GDAEvyp3i&!
JWT_REFRESH_SECRET=7uPyrmD5No&WtH9nFVdp%+X*!KZv2EcBfkOx1@qARSb#i3gzUwhJ6YslQ?Ij0eL
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
AUTH_PORT=3001
```

---

## 🔧 User Service 환경 변수

Railway Dashboard → User Service → Variables 탭에서 추가:

```
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority
DB_NAME=fairproject
JWT_SECRET=lB6#@=HUfen*MTWVSg-Yrzak18ZQhc7qJOmtL$boCPX%d?IswN2j0GDAEvyp3i&!
JWT_REFRESH_SECRET=7uPyrmD5No&WtH9nFVdp%+X*!KZv2EcBfkOx1@qARSb#i3gzUwhJ6YslQ?Ij0eL
NODE_ENV=production
USER_PORT=3002
```

---

## 🔧 Assignment Service 환경 변수

Railway Dashboard → Assignment Service → Variables 탭에서 추가:

```
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority
DB_NAME=fairproject
JWT_SECRET=lB6#@=HUfen*MTWVSg-Yrzak18ZQhc7qJOmtL$boCPX%d?IswN2j0GDAEvyp3i&!
NODE_ENV=production
ASSIGNMENT_PORT=3003
```

---

## 🔧 File Service 환경 변수

Railway Dashboard → File Service → Variables 탭에서 추가:

```
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority
DB_NAME=fairproject
JWT_SECRET=lB6#@=HUfen*MTWVSg-Yrzak18ZQhc7qJOmtL$boCPX%d?IswN2j0GDAEvyp3i&!
NODE_ENV=production
FILE_PORT=3004
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

---

## 🔧 Realtime Service 환경 변수

Railway Dashboard → Realtime Service → Variables 탭에서 추가:

```
MONGODB_URI=mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/student_management?retryWrites=true&w=majority
DB_NAME=fairproject
NODE_ENV=production
REALTIME_PORT=3005
```

---

## ✅ 환경 변수 입력 방법

### 방법 1: Raw Editor (추천)

1. Variables 탭에서 **Raw Editor** 클릭
2. 위 텍스트를 **그대로 복사/붙여넣기**
3. **Update Variables** 클릭

### 방법 2: 개별 입력

1. **New Variable** 클릭
2. Variable Name과 Value 입력
3. **Add** 클릭
4. 모든 변수에 대해 반복

---

## 🚨 주의사항

### 1. MONGODB_URI 형식
- ✅ 올바름: `mongodb+srv://bugsdb:wkaaksqh1984@cluster0.1vzlqku.mongodb.net/...`
- ❌ 잘못됨: `&tls=true` 파라미터 추가 (mongodb+srv는 자동으로 TLS 사용)
- ❌ 잘못됨: 비밀번호에 공백이나 줄바꿈 포함

### 2. JWT_SECRET
- 특수문자가 포함되어 있으므로 **정확히 복사**하세요
- 따옴표 없이 입력 (Railway가 자동으로 처리)

### 3. Google Drive (File Service만 해당)
- 과제 제출 기능을 사용하지 않으면 생략 가능
- 사용하려면 `GOOGLE_DRIVE_SETUP.md` 참고

---

## 🔍 환경 변수 확인 방법

Railway 로그에서 다음 메시지 확인:

```
🔗 Connecting to MongoDB: mongodb+srv://bugsdb:****@cluster0.1vzlqku.mongodb.net/...
🌍 Environment: production
✅ MongoDB client connected successfully
✅ Connected to MongoDB database: fairproject
```

만약 `mongodb://localhost:27017`가 표시되면 **MONGODB_URI가 설정되지 않은 것**입니다!

---

## 🐛 트러블슈팅

### "Failed to start: MongoServerSelectionError"
→ MongoDB Atlas Network Access에서 0.0.0.0/0 허용했는지 확인

### "mongodb://localhost:27017" 로그가 보임
→ MONGODB_URI 환경 변수가 설정되지 않음. Raw Editor로 다시 확인

### "Unauthorized" 또는 "Authentication failed"
→ MONGODB_URI의 username/password 확인 (공백, 줄바꿈 없어야 함)

### JWT 관련 오류
→ JWT_SECRET, JWT_REFRESH_SECRET이 모든 서비스에서 **동일**한지 확인

---

## 📋 체크리스트

- [ ] MongoDB Atlas Network Access에 0.0.0.0/0 추가
- [ ] Auth Service에 8개 환경 변수 설정
- [ ] User Service에 6개 환경 변수 설정
- [ ] Assignment Service에 5개 환경 변수 설정
- [ ] File Service에 8개 환경 변수 설정
- [ ] Realtime Service에 4개 환경 변수 설정
- [ ] 각 서비스 Redeploy 또는 자동 재배포 대기
- [ ] 로그에서 "Connected to MongoDB database: fairproject" 확인

---

## 🚀 배포 후 테스트

각 서비스 URL에 `/api/health` 엔드포인트가 있다면:

```bash
curl https://your-auth-service.railway.app/api/health
curl https://your-user-service.railway.app/api/health
```

200 OK 응답이 와야 정상입니다.

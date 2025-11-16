# Railway CORS 설정 - 즉시 적용 필요!

## 🚨 각 서비스에 추가해야 할 환경 변수

Railway 대시보드에서 각 서비스의 **Variables** 탭에 다음 환경 변수를 추가하세요:

### Auth Service (fairschool.up.railway.app)
```
CORS_ORIGIN=*
```

### User Service (users-fairschool.up.railway.app)
```
CORS_ORIGIN=*
```

### Assignment Service (assignment-fairschool.up.railway.app)
```
CORS_ORIGIN=*
```

### File Service (file-fairschool.up.railway.app)
```
CORS_ORIGIN=*
```

### Realtime Service (realtime-fairschool.up.railway.app)
```
CORS_ORIGIN=*
```

---

## ⚙️ 설정 방법

1. Railway Dashboard → 서비스 선택
2. **Variables** 탭 클릭
3. **New Variable** 클릭
4. Variable Name: `CORS_ORIGIN`
5. Value: `*`
6. **Add** 클릭
7. 자동으로 재배포됩니다 (1-2분 소요)

---

## 🔒 프로덕션 보안 (선택사항)

개발/테스트가 완료되면 `*` 대신 실제 도메인으로 변경:

```
CORS_ORIGIN=https://fairschool.up.railway.app
```

여러 도메인 허용:
```
CORS_ORIGIN=https://fairschool.up.railway.app,https://admin.fairschool.com
```

---

## ✅ 확인 방법

1. 모든 서비스에 CORS_ORIGIN 추가
2. 재배포 완료 대기 (1-2분)
3. https://fairschool.up.railway.app 접속
4. 브라우저 개발자 도구 → Network 탭
5. 로그인 시도 → API 요청 확인

**성공:** 200 OK 응답
**실패:** CORS policy 오류 → 환경 변수 재확인

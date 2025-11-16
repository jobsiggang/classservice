# Railway 슈퍼어드민 접속 가이드

## 🔐 슈퍼어드민 로그인 방법

### 로컬 개발 환경
```
http://admin.localhost:3001
```

### Railway 프로덕션 환경
```
https://fairschool.up.railway.app/admin
```

**주의:** Railway에서는 서브도메인 라우팅이 작동하지 않으므로 `/admin` 경로를 사용합니다.

---

## 📋 작동 방식

### 로컬 (localhost)
- `admin.localhost:3001` → 슈퍼어드민 포털
- `eonyang-hs.localhost:3001` → 언양고등학교 포털
- `localhost:3001` → 일반 로그인 (학교 선택 없음)

### Railway (프로덕션)
- `https://fairschool.up.railway.app/admin` → 슈퍼어드민 포털
- `https://fairschool.up.railway.app/` → 일반 사용자 로그인

---

## 🎯 슈퍼어드민 기능

1. **학교 관리**
   - 학교 추가/삭제
   - 서브도메인 설정
   - 학교 정보 수정

2. **시스템 관리**
   - 모든 학교 데이터 조회
   - 시스템 설정

---

## 🔧 코드 변경 사항

### `public/app.js`
```javascript
// Admin 포털 감지 로직
isAdminPortal = host.startsWith('admin.') || pathname.startsWith('/admin');
```

- 로컬: `admin.` 서브도메인 체크
- Railway: `/admin` 경로 체크

---

## 🚀 배포 후 테스트

1. https://fairschool.up.railway.app/admin 접속
2. "🔐 시스템 관리자 포털" 메시지 확인
3. 슈퍼어드민 계정으로 로그인
4. admin.html로 리다이렉트 확인

---

## 💡 일반 사용자와 구분

- **일반 사용자**: https://fairschool.up.railway.app → 학교 선택 후 로그인
- **슈퍼어드민**: https://fairschool.up.railway.app/admin → 학교 관리 가능

---

## ⚠️ 보안 고려사항

Railway 프로덕션에서는 `/admin` 경로를 추가적으로 보호할 수 있습니다:

1. **IP 화이트리스트** (Railway 설정)
2. **2FA 추가** (추후 구현)
3. **로그인 시도 제한** (Rate Limiting)

현재는 이메일/비밀번호 인증만으로 보호되고 있습니다.

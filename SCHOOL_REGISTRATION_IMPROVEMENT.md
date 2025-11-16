# 🔐 학교 등록 프로세스 개선 사항

> **업데이트 날짜:** 2025-11-16  
> **변경 목적:** 학교 관리자 계정 자동 생성 편의성 개선 및 보안 강화

---

## 📋 주요 변경 사항

### 1️⃣ 학교 등록 시 관리자 계정 자동 생성 개선

#### 변경 전
```javascript
// 슈퍼어드민이 관리자 이메일과 비밀번호를 직접 입력
{
  schoolName: "운양고등학교",
  adminName: "김관리",
  adminEmail: "admin@unyang.hs",     // 수동 입력
  adminPassword: "admin123"           // 수동 입력
}
```

#### 변경 후
```javascript
// 이메일과 비밀번호가 서브도메인 기반으로 자동 생성
{
  schoolName: "운양고등학교",
  adminName: "김관리"
  // adminEmail: "admin@서브도메인주소" (자동 생성)
  // adminPassword: 서브도메인주소 (자동 생성)
}
```

**장점:**
- ✅ 슈퍼어드민이 입력할 항목 감소 (5개 → 2개)
- ✅ 관리자 이메일이 서브도메인과 일치하여 직관적
- ✅ 초기 비밀번호도 서브도메인으로 통일되어 관리 용이

**예시:**
```
학교명: 운양고등학교
서브도메인: unyang-high

→ 관리자 이메일: admin@unyang-high
→ 초기 비밀번호: unyang-high
→ 접속 주소: http://unyang-high.localhost:3001
```

---

### 2️⃣ 첫 로그인 시 비밀번호 변경 강제

#### 보안 강화 프로세스

1. **학교 생성 시**
   ```javascript
   // user/api/school.ts
   const admin = {
     email: `admin@${schoolId}`,
     password: hashedPassword,
     requirePasswordChange: true  // 플래그 추가
   };
   ```

2. **로그인 시 플래그 반환**
   ```javascript
   // auth/api/login.ts
   return {
     accessToken,
     refreshToken,
     requirePasswordChange: true,  // 첫 로그인 여부
     user: { ... }
   };
   ```

3. **프론트엔드에서 비밀번호 변경 모달 자동 표시**
   ```javascript
   // public/app.js
   if (data.data.requirePasswordChange) {
     showMessage('보안을 위해 첫 로그인 시 비밀번호를 변경해주세요.', 'warning');
     showPasswordChangeModal();
   }
   ```

4. **비밀번호 변경 API**
   ```
   POST /api/auth/change-password
   {
     currentPassword: "unyang-high",
     newPassword: "새비밀번호123!"
   }
   ```

5. **변경 후 플래그 제거**
   ```javascript
   // auth/api/change-password.ts
   await db.collection('users').updateOne(
     { _id: user._id },
     { 
       $set: { password: hashedPassword },
       $unset: { requirePasswordChange: "" }  // 플래그 삭제
     }
   );
   ```

---

### 3️⃣ test.html → 슈퍼관리자 설정 전용 페이지로 변경

#### 변경 전: API 테스터 페이지
- Health Check
- 학교 생성 테스트
- 로그인 테스트
- 클래스 생성 테스트
- ...

#### 변경 후: 슈퍼관리자 설정 전문 페이지

**접속 주소:** `http://admin.localhost:3001/test.html`

**기능:**

1. **슈퍼관리자 계정 생성** (최초 1회)
   ```
   - 이름 입력
   - 이메일 입력
   - 비밀번호 입력 (6자 이상)
   ```

2. **슈퍼관리자 로그인**
   ```
   - 이메일
   - 비밀번호
   ```

3. **시스템 대시보드**
   ```
   📊 시스템 통계
   - 등록된 학교: 5개
   - 전체 사용자: 120명
   - 전체 클래스: 25개
   ```

4. **관리 기능**
   - 🎓 관리 포털로 이동 (admin.html)
   - ⚠️ 데이터베이스 초기화
   - 로그아웃

**보안:**
- admin.localhost 도메인 체크
- 슈퍼관리자 권한 검증
- 최초 설정 여부 확인

---

### 4️⃣ 슈퍼관리자 전용 학교 관리 페이지 신설

**파일:** `public/admin.html`  
**접속 주소:** `http://admin.localhost:3001/admin.html`

**주요 기능:**

#### 📊 시스템 통계 대시보드
```
🏫 등록된 학교     👥 전체 사용자     📚 전체 클래스     📝 전체 과제
    5개              120명              25개              180개
```

#### 🏫 학교 목록 관리
```
┌─────────────────────────────────┐
│ 🏫 운양고등학교                  │
│ 서브도메인: unyang-high          │
│ 관리자: 1명                      │
│ 생성일: 2025-11-16               │
│ http://unyang-high.localhost:3001│
│ [접속하기] [삭제]                 │
└─────────────────────────────────┘
```

#### ➕ 학교 생성 간소화
```
학교명: [운양고등학교]
서브도메인: [unyang-high] (선택사항)
관리자 이름: [김관리]

┌──────────────────────────────┐
│ 자동 생성 정보                │
│ 관리자 이메일: admin@unyang-high│
│ 초기 비밀번호: unyang-high    │
│ (첫 로그인 시 변경 필요)      │
└──────────────────────────────┘

[취소] [생성]
```

---

### 5️⃣ 불필요한 UI 요소 제거

#### index.html (로그인 페이지)
- ❌ 학교 생성 모달 HTML 제거
- ❌ 회원가입 폼 제거 (필요 시 별도 페이지로)
- ✅ 간결한 로그인 화면 유지

#### app.js (메인 애플리케이션)
- ❌ `openCreateSchoolModal()` 함수 제거
- ❌ `handleCreateSchool()` 함수 제거
- ❌ 학교 생성 이벤트 리스너 제거
- ✅ 비밀번호 변경 기능 추가

---

## 🔄 전체 플로우

### 시스템 최초 설정
```
1. 개발자가 http://admin.localhost:3001/test.html 접속
2. 슈퍼관리자 계정 생성
   - 이름: 시스템관리자
   - 이메일: admin@fairschool.kr
   - 비밀번호: super123!
3. 로그인 후 시스템 대시보드 확인
```

### 학교 추가
```
1. test.html에서 "관리 포털로 이동" 클릭
   → http://admin.localhost:3001/admin.html 이동

2. "+ 학교 생성" 클릭
   - 학교명: 운양고등학교
   - 서브도메인: unyang-high (또는 비워서 자동 생성)
   - 관리자 이름: 김관리

3. 생성 완료 알림
   ┌─────────────────────────────────┐
   │ ✅ 학교가 생성되었습니다!         │
   │                                  │
   │ 학교명: 운양고등학교              │
   │ 접속 주소:                        │
   │ http://unyang-high.localhost:3001│
   │                                  │
   │ 관리자 이메일: admin@unyang-high │
   │ 초기 비밀번호: unyang-high       │
   │                                  │
   │ 관리자에게 로그인 정보를           │
   │ 전달해주세요.                     │
   └─────────────────────────────────┘
```

### 학교 관리자 첫 로그인
```
1. http://unyang-high.localhost:3001 접속
2. 로그인
   - 이메일: admin@unyang-high
   - 비밀번호: unyang-high

3. 자동으로 비밀번호 변경 모달 표시
   ┌─────────────────────────────┐
   │ 비밀번호 변경                │
   │                              │
   │ 현재 비밀번호: [unyang-high] │
   │ 새 비밀번호: [********]      │
   │ 비밀번호 확인: [********]    │
   │                              │
   │           [변경]             │
   └─────────────────────────────┘

4. 비밀번호 변경 후 정상 접속
   → 클래스 생성, 학생 관리 등
```

---

## 📁 변경된 파일 목록

### 백엔드
```
✏️ user/api/school.ts
   - 관리자 이메일/비밀번호 자동 생성
   - requirePasswordChange 플래그 추가

✏️ auth/api/login.ts
   - requirePasswordChange 플래그 반환

➕ auth/api/change-password.ts (신규)
   - 비밀번호 변경 API

✏️ auth/index.ts
   - change-password 라우트 추가
```

### 프론트엔드
```
✏️ public/index.html
   - 학교 생성 모달 HTML 제거
   - 간결한 로그인 UI

✏️ public/app.js
   - 학교 생성 함수 제거
   - 비밀번호 변경 모달 추가
   - requirePasswordChange 처리

✏️ public/test.html
   - 슈퍼관리자 설정 전용 페이지로 변경
   - 초기 설정 → 로그인 → 대시보드 플로우

➕ public/admin.html (신규)
   - 슈퍼관리자 전용 학교 관리 페이지
   - 통계 대시보드
   - 학교 생성/삭제/관리
```

---

## 🎯 개선 효과

### 1. 사용성 개선
- 학교 등록 시 입력 항목 60% 감소 (5개 → 2개)
- 직관적인 이메일/비밀번호 패턴 (서브도메인 기반)
- 전용 관리 페이지로 역할 분리 명확화

### 2. 보안 강화
- 첫 로그인 시 비밀번호 강제 변경
- 슈퍼관리자 전용 도메인 분리 (admin.localhost)
- 권한 없는 페이지 접근 차단

### 3. 유지보수 개선
- 일반 로그인 페이지에서 관리자 기능 분리
- 코드 복잡도 감소
- 역할별 UI 명확화

---

## 🚀 다음 개선 예정

1. **비밀번호 정책 강화**
   - 대소문자, 숫자, 특수문자 조합 강제
   - 비밀번호 유효기간 설정

2. **2단계 인증 (2FA)**
   - OTP 또는 이메일 인증

3. **감사 로그**
   - 학교 생성/삭제 기록
   - 관리자 활동 로그

4. **대량 학교 등록**
   - CSV 업로드로 여러 학교 한번에 등록

---

**이 변경사항으로 학교 등록 프로세스가 더욱 간편하고 안전해졌습니다! 🎉**

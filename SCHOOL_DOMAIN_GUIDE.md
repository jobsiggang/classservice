# 학교별 독립 도메인 시스템

## 📋 개요
각 학교가 고유한 서브도메인으로 완전히 독립된 환경에서 운영됩니다.

## 🌐 도메인 구조

### 로컬 개발 환경
```
http://{schoolId}.localhost:3001
```

**예시:**
- `http://unyang-high.localhost:3001` - 언양고등학교
- `http://seoul-middle.localhost:3001` - 서울중학교
- `http://busan-elem.localhost:3001` - 부산초등학교

### 프로덕션 환경
```
https://{schoolId}.fairschool.kr
```

## 🏫 학교 생성 방법

### 1. 기본 등록 (서브도메인 자동 생성)
```javascript
POST /api/user/schools
{
  "schoolName": "언양고등학교",
  "adminName": "김관리",
  "adminEmail": "admin@unyang.kr",
  "adminPassword": "password123"
}

응답:
{
  "schoolId": "unyang-high-x3k9p2",
  "subdomain": "unyang-high-x3k9p2",
  "localUrl": "http://unyang-high-x3k9p2.localhost:3001",
  "productionUrl": "https://unyang-high-x3k9p2.fairschool.kr"
}
```

### 2. 커스텀 서브도메인 지정
```javascript
POST /api/user/schools
{
  "schoolName": "언양고등학교",
  "subdomain": "unyang-high",  // 원하는 서브도메인
  "adminName": "김관리",
  "adminEmail": "admin@unyang.kr",
  "adminPassword": "password123"
}

응답:
{
  "schoolId": "unyang-high",
  "subdomain": "unyang-high",
  "localUrl": "http://unyang-high.localhost:3001",
  "productionUrl": "https://unyang-high.fairschool.kr"
}
```

## 🔧 서브도메인 규칙

### 허용되는 문자
- 영문 소문자 (a-z)
- 숫자 (0-9)
- 하이픈 (-)

### 자동 생성 로직
1. 학교명을 소문자로 변환
2. 공백을 하이픈(-)으로 변경
3. 허용되지 않는 문자 제거
4. 최대 20자로 제한
5. 6자리 랜덤 코드 추가

**예시:**
- "언양고등학교" → `unyanggodeunghaggyo-x3k9p2` (한글 제거됨)
- "Seoul High School" → `seoul-high-school-x3k9p2`
- "부산 제일 중학교" → `busan-jeil-junghakgy-x3k9p2`

## 🔐 hosts 파일 설정 (Windows)

로컬에서 서브도메인을 테스트하려면 hosts 파일 수정:

```
C:\Windows\System32\drivers\etc\hosts
```

다음 라인 추가:
```
127.0.0.1 unyang-high.localhost
127.0.0.1 seoul-middle.localhost
127.0.0.1 busan-elem.localhost
```

또는 와일드카드 DNS 설정 (권장):
```
127.0.0.1 *.localhost
```

## 📊 학교별 데이터 분리

### MongoDB 컬렉션 구조
모든 데이터는 `schoolId` 필드로 필터링됩니다:

```javascript
// 학교 정보
{
  _id: "unyang-high",  // schoolId
  name: "언양고등학교",
  subdomain: "unyang-high",
  domain: "unyang-high.localhost:3001",
  productionDomain: "unyang-high.fairschool.kr",
  adminIds: ["..."],
  createdAt: Date,
  settings: {...}
}

// 사용자 (관리자, 교사, 학생)
{
  _id: "...",
  name: "홍길동",
  email: "hong@unyang.kr",
  role: "teacher",
  schoolId: "unyang-high",  // 학교 ID로 분리
  ...
}

// 클래스
{
  _id: "...",
  name: "1학년 1반",
  schoolId: "unyang-high",  // 학교 ID로 분리
  classCode: "ABC123",
  ...
}

// 과제, 제출물 등 모든 데이터
{
  ...
  schoolId: "unyang-high"  // 모든 컬렉션에 schoolId 포함
}
```

### API 엔드포인트 필터링
모든 API는 자동으로 현재 사용자의 schoolId로 필터링:

```javascript
// 클래스 목록 조회 시
const classes = await db.collection('classes')
  .find({ schoolId: req.user.schoolId })
  .toArray();

// 학생 목록 조회 시
const students = await db.collection('users')
  .find({ 
    schoolId: req.user.schoolId,
    role: 'student' 
  })
  .toArray();
```

## 🚀 사용 흐름

### 1단계: 학교 생성
```
1. http://localhost:3001 접속
2. "학교 등록" 탭 선택
3. 학교 정보 입력 (서브도메인 선택사항)
4. 등록 완료 → 학교 전용 URL 생성
```

### 2단계: 학교별 URL 접속
```
1. 생성된 URL로 자동 리다이렉트
   예: http://unyang-high.localhost:3001
   
2. 관리자 계정으로 로그인
   
3. 해당 학교만의 독립된 환경에서 작업
```

### 3단계: 데이터 관리
```
- 클래스 생성 → schoolId 자동 할당
- 학생 등록 → schoolId 자동 할당
- 과제 생성 → schoolId 자동 할당

→ 다른 학교 데이터와 완전 분리
```

## 🔒 보안 및 격리

### 데이터 격리
- 각 학교는 자신의 schoolId를 가진 데이터만 조회 가능
- API 레벨에서 schoolId 검증
- 타 학교 데이터 접근 시도 시 403 Forbidden

### 인증 토큰
- JWT 토큰에 schoolId 포함
- 모든 요청에서 schoolId 검증

```javascript
// JWT 페이로드
{
  userId: "...",
  email: "admin@unyang.kr",
  role: "admin",
  schoolId: "unyang-high"  // 학교 ID 포함
}
```

## 📱 실제 사용 예시

### 언양고등학교
```
URL: http://unyang-high.localhost:3001
관리자: admin@unyang.kr
학생: 150명
클래스: 6개
독립 운영
```

### 서울중학교
```
URL: http://seoul-middle.localhost:3001
관리자: admin@seoul.kr
학생: 300명
클래스: 9개
독립 운영 (언양고와 완전 분리)
```

## 🛠️ 슈퍼관리자 기능

슈퍼관리자는 모든 학교를 관리할 수 있습니다:

```
URL: http://localhost:3001/superadmin.html
기능:
- 모든 학교 목록 조회
- 신규 학교 생성
- 학교 삭제
- 전체 통계 확인
```

## 🔄 마이그레이션 (기존 데이터)

기존에 schoolId 없이 생성된 데이터가 있다면:

```javascript
// MongoDB에서 일괄 업데이트
db.users.updateMany(
  { schoolId: { $exists: false } },
  { $set: { schoolId: "default-school" } }
);

db.classes.updateMany(
  { schoolId: { $exists: false } },
  { $set: { schoolId: "default-school" } }
);
```

## ✅ 체크리스트

학교 생성 후 확인 사항:
- [ ] 학교 전용 URL 생성 확인
- [ ] 해당 URL로 접속 가능
- [ ] 관리자 로그인 성공
- [ ] 클래스 생성 가능
- [ ] 학생 등록 가능
- [ ] 다른 학교 데이터 보이지 않음
- [ ] 클래스 코드 정상 작동

## 🐛 트러블슈팅

### 서브도메인이 작동하지 않을 때
1. hosts 파일 확인 (`C:\Windows\System32\drivers\etc\hosts`)
2. 브라우저 캐시 삭제
3. DNS 캐시 플러시: `ipconfig /flushdns`

### 다른 학교 데이터가 보일 때
1. JWT 토큰 재발급 (로그아웃 후 재로그인)
2. API에서 schoolId 필터링 확인
3. 브라우저 개발자 도구에서 토큰 확인

## 🎯 다음 단계

1. 프로덕션 DNS 설정 (*.fairschool.kr)
2. SSL 인증서 설정 (Let's Encrypt 와일드카드)
3. 학교별 사용량 모니터링
4. 학교별 커스텀 테마/로고 지원

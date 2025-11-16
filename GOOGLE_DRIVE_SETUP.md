# Google Drive API 설정 가이드

이 프로젝트는 파일 저장소로 Google Drive를 사용합니다.

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `education-platform` (원하는 이름)

### 1.2 Google Drive API 활성화
1. 좌측 메뉴 > **API 및 서비스** > **라이브러리**
2. "Google Drive API" 검색
3. **사용 설정** 클릭

### 1.3 서비스 계정 생성
1. 좌측 메뉴 > **API 및 서비스** > **사용자 인증 정보**
2. **사용자 인증 정보 만들기** > **서비스 계정**
3. 서비스 계정 이름: `education-file-service`
4. **만들기 및 계속하기** 클릭
5. 역할: **기본** (또는 권한 없음)
6. **완료** 클릭

### 1.4 서비스 계정 키 생성
1. 생성된 서비스 계정 클릭
2. **키** 탭 선택
3. **키 추가** > **새 키 만들기**
4. 키 유형: **JSON** 선택
5. **만들기** 클릭
6. JSON 파일 자동 다운로드됨 (안전하게 보관!)

## 2. Google Drive 폴더 설정

### 2.1 루트 폴더 생성
1. [Google Drive](https://drive.google.com/) 접속
2. 새 폴더 생성: `education-platform-files`
3. 폴더 우클릭 > **공유** > **공유 대상 추가**
4. 서비스 계정 이메일 추가 (JSON 파일의 `client_email` 값)
   - 예: `education-file-service@project-id.iam.gserviceaccount.com`
5. 권한: **편집자**
6. **전송** 클릭

### 2.2 폴더 ID 확인
1. 폴더 열기
2. 주소창 URL 확인
   - 형식: `https://drive.google.com/drive/folders/FOLDER_ID`
   - `FOLDER_ID` 부분 복사

## 3. 환경 변수 설정

`.env` 파일에 다음 내용 추가:

```env
# Google Drive API 설정
GOOGLE_SERVICE_ACCOUNT_EMAIL=education-file-service@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...(생략)...VqE=\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=1AbC2DeF3GhI4JkL5MnO6PqR7StU8VwX9

# 기존 AWS 설정은 제거 또는 주석 처리
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# AWS_S3_BUCKET=
```

### JSON 키 파일에서 값 추출:
다운로드한 JSON 파일을 열고:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_SERVICE_ACCOUNT_KEY` (큰따옴표 포함)

**주의**: `private_key`는 `\n`을 그대로 유지해야 합니다!

## 4. 폴더 구조

Google Drive에 자동으로 생성되는 폴더 구조:

```
education-platform-files/
├── school123/
│   └── uploads/
│       ├── assignment1_report.pdf
│       ├── homework2_essay.docx
│       └── ...
├── school456/
│   └── uploads/
│       └── ...
└── ...
```

각 학교별로 폴더가 생성되며, 멀티테넌트 격리가 유지됩니다.

## 5. 테스트

서버 재시작 후 파일 업로드 테스트:

```bash
docker-compose up -d --build file
```

브라우저에서 파일 업로드 시:
- Google Drive의 해당 폴더에 파일이 업로드됨
- 업로드된 파일은 "링크가 있는 모든 사용자" 보기 가능

## 6. 보안 주의사항

1. **서비스 계정 JSON 키는 절대 Git에 커밋하지 마세요!**
   - `.gitignore`에 `.env` 포함 확인
2. 서비스 계정 키는 안전한 장소에 백업
3. 프로덕션 환경에서는 환경 변수 암호화 사용 권장
4. 정기적으로 서비스 계정 키 갱신

## 7. 용량 관리

- Google Drive 무료: 15GB
- Google Workspace (유료): 30GB ~ 무제한
- 필요 시 Google Workspace로 업그레이드

## 문제 해결

### "Permission denied" 오류
→ 서비스 계정 이메일이 폴더에 공유되었는지 확인

### "Invalid grant" 오류  
→ `private_key`의 `\n`이 제대로 들어갔는지 확인

### 파일이 업로드되지 않음
→ Google Drive API가 활성화되었는지 확인
→ Docker 로그 확인: `docker logs services-file-1`

# Google Cloud Storage 설정 가이드

이 프로젝트는 파일 저장소로 Google Cloud Storage를 사용합니다.

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `education-platform` (원하는 이름)

### 1.2 Cloud Storage API 활성화
1. 좌측 메뉴 > **API 및 서비스** > **라이브러리**
2. "Cloud Storage API" 검색
3. **사용 설정** 클릭

### 1.3 서비스 계정 생성
1. 좌측 메뉴 > **API 및 서비스** > **사용자 인증 정보**
2. **사용자 인증 정보 만들기** > **서비스 계정**
3. 서비스 계정 이름: `education-file-service`
4. **만들기 및 계속하기** 클릭
5. 역할: **Storage 관리자** (Storage Admin)
6. **완료** 클릭

### 1.4 서비스 계정 키 생성
1. 생성된 서비스 계정 클릭
2. **키** 탭 선택
3. **키 추가** > **새 키 만들기**
4. 키 유형: **JSON** 선택
5. **만들기** 클릭
6. JSON 파일 자동 다운로드됨 (안전하게 보관!)

## 2. Cloud Storage 버킷 생성

### 2.1 버킷 만들기
1. 좌측 메뉴 > **Cloud Storage** > **버킷**
2. **만들기** 클릭
3. 버킷 설정:
   - **이름**: `education-platform-files` (전역적으로 고유해야 함)
   - **위치 유형**: Region
   - **위치**: `asia-northeast3 (서울)` 또는 `asia-northeast1 (도쿄)`
   - **스토리지 클래스**: Standard
   - **액세스 제어**: Uniform (균일한 액세스)
   - **보호 도구**: 기본값
4. **만들기** 클릭

### 2.2 CORS 설정 (웹에서 접근 시)
```bash
# cors.json 파일 생성
[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]

# CORS 설정 적용
gsutil cors set cors.json gs://education-platform-files
```

## 3. 환경 변수 설정

`.env` 파일에 다음 내용 추가:

```env
# Google Cloud Storage 설정
GCP_PROJECT_ID=your-project-id
GCP_SERVICE_ACCOUNT_EMAIL=education-file-service@your-project-id.iam.gserviceaccount.com
GCP_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...(생략)...VqE=\n-----END PRIVATE KEY-----\n"
GCS_BUCKET_NAME=education-platform-files

# 기존 Google Drive 설정은 제거
# GOOGLE_SERVICE_ACCOUNT_EMAIL=
# GOOGLE_DRIVE_FOLDER_ID=
```

### JSON 키 파일에서 값 추출:
다운로드한 JSON 파일을 열고:
- `project_id` → `GCP_PROJECT_ID`
- `client_email` → `GCP_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GCP_SERVICE_ACCOUNT_KEY` (큰따옴표 포함)

**주의**: `private_key`는 `\n`을 그대로 유지해야 합니다!

## 4. 폴더 구조

Google Cloud Storage에 자동으로 생성되는 구조:

```
education-platform-files/
├── school123/
│   └── uploads/
│       ├── report.pdf
│       └── ...
├── classId1/
│   └── assignmentId1/
│       ├── 10101/  (학번)
│       │   ├── homework.pdf
│       │   └── essay.docx
│       ├── 10102/
│       │   └── ...
│       └── ...
└── ...
```

**과제 제출 파일**: `{classId}/{assignmentId}/{studentNumber}/{filename}`

## 5. 테스트

서버 재시작 후 파일 업로드 테스트:

```bash
docker-compose up -d --build file
```

브라우저에서 파일 업로드 시:
- GCS 버킷에 파일이 업로드됨
- Signed URL로 7일간 접근 가능
- 만료 시 자동 갱신 가능

## 6. 보안 주의사항

1. **서비스 계정 JSON 키는 절대 Git에 커밋하지 마세요!**
   - `.gitignore`에 `.env` 포함 확인
2. 서비스 계정 키는 안전한 장소에 백업
3. 버킷은 **공개하지 않고** Signed URL 사용
4. IAM 권한: 최소 권한 원칙 적용

## 7. 비용 관리

### 무료 할당량 (매월):
- Storage: 5GB
- Class A 작업: 5,000건
- Class B 작업: 50,000건
- 네트워크 이그레스 (북미): 1GB

### 유료 요금 (서울 리전):
- **Storage**: $0.020/GB/월
- **Class A 작업** (쓰기): $0.05/10,000건
- **Class B 작업** (읽기): $0.004/10,000건
- **네트워크 이그레스**: $0.12/GB (아시아)

### 비용 예측 (100명 학생):
- 파일 저장: 10GB = **$0.20/월**
- 업로드: 1,000건/월 = **$0.005/월**
- 다운로드: 5,000건/월 = **$0.002/월**
- **총 예상 비용: $0.21/월** (매우 저렴!)

## 8. 장점 요약

✅ **폴더 관리 불필요**: 경로 기반 구조  
✅ **빠른 속도**: CDN 지원  
✅ **Signed URL**: 보안 강화  
✅ **저렴한 비용**: 월 $0.2 수준  
✅ **무제한 확장**: 용량 제한 없음  
✅ **자동 백업**: 내구성 99.999999999%  

## 문제 해결

### "Permission denied" 오류
→ 서비스 계정에 "Storage 관리자" 역할이 있는지 확인

### "Bucket not found" 오류  
→ `GCS_BUCKET_NAME`이 정확한지 확인

### "Invalid credentials" 오류
→ `private_key`의 `\n`이 제대로 들어갔는지 확인

### Docker 로그 확인
```bash
docker logs services-file-1
```

## 9. 고급 기능

### 9.1 수명 주기 관리 (자동 삭제)
1. 버킷 > **수명 주기** 탭
2. **규칙 추가**
3. 조건: 90일 경과
4. 작업: 객체 삭제

### 9.2 버전 관리
1. 버킷 > **보호** 탭
2. **객체 버전 관리** 사용 설정
3. 파일 덮어쓰기 시 이전 버전 유지

### 9.3 모니터링
1. **Cloud Console** > **Storage** > **대시보드**
2. 사용량, 요청 수, 비용 확인

# Docker 마이크로서비스 배포 가이드

이 가이드는 FairProject 마이크로서비스를 Docker를 사용하여 배포하는 방법을 설명합니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [환경 설정](#환경-설정)
3. [로컬 배포](#로컬-배포)
4. [프로덕션 배포](#프로덕션-배포)
5. [서비스 관리](#서비스-관리)
6. [트러블슈팅](#트러블슈팅)

## 🔧 사전 요구사항

### 필수 소프트웨어
- Docker (버전 20.10 이상)
- Docker Compose (버전 2.0 이상)
- Git

### 설치 확인
```bash
docker --version
docker-compose --version
```

## ⚙️ 환경 설정

### 1. 환경 변수 파일 생성

`.env` 파일이 이미 존재합니다. 프로덕션 배포를 위해 다음 값들을 수정하세요:

```bash
# .env 파일 편집
# Windows PowerShell
notepad .env

# 또는 VS Code
code .env
```

### 2. 필수 환경 변수 설정

#### MongoDB 설정
```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

#### JWT 시크릿 (보안을 위해 반드시 변경!)
```env
JWT_SECRET=<강력한-랜덤-문자열-생성>
JWT_REFRESH_SECRET=<다른-강력한-랜덤-문자열>
```

강력한 시크릿 생성 방법:
```bash
# Node.js로 랜덤 시크릿 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### AWS S3 설정 (파일 서비스용)
```env
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name
```

#### CORS 설정
```env
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🚀 로컬 배포

### 전체 서비스 빌드 및 실행

```bash
# 모든 서비스 빌드 및 시작
docker-compose up --build

# 백그라운드에서 실행
docker-compose up -d --build
```

### 개별 서비스 실행

```bash
# Auth 서비스만 실행
docker-compose up auth

# User 서비스만 실행
docker-compose up user

# 여러 서비스 동시 실행
docker-compose up auth user assignment
```

### 빌드 없이 실행 (이미 빌드된 이미지 사용)

```bash
docker-compose up -d
```

## 🌐 프로덕션 배포

### 1. 프로덕션 환경 변수 설정

```bash
# NODE_ENV를 production으로 설정 (이미 .env에 설정됨)
NODE_ENV=production
```

### 2. 이미지 빌드 및 태깅

```bash
# 모든 서비스 이미지 빌드
docker-compose build

# 특정 버전으로 태그 (옵션)
docker tag fairproject-auth:latest fairproject-auth:v1.0.0
docker tag fairproject-user:latest fairproject-user:v1.0.0
docker tag fairproject-assignment:latest fairproject-assignment:v1.0.0
docker tag fairproject-file:latest fairproject-file:v1.0.0
docker tag fairproject-realtime:latest fairproject-realtime:v1.0.0
```

### 3. Docker Hub에 이미지 푸시 (옵션)

```bash
# Docker Hub 로그인
docker login

# 이미지 태깅
docker tag fairproject-auth:latest your-username/fairproject-auth:latest
docker tag fairproject-user:latest your-username/fairproject-user:latest
docker tag fairproject-assignment:latest your-username/fairproject-assignment:latest
docker tag fairproject-file:latest your-username/fairproject-file:latest
docker tag fairproject-realtime:latest your-username/fairproject-realtime:latest

# 이미지 푸시
docker push your-username/fairproject-auth:latest
docker push your-username/fairproject-user:latest
docker push your-username/fairproject-assignment:latest
docker push your-username/fairproject-file:latest
docker push your-username/fairproject-realtime:latest
```

### 4. 서버에서 배포

```bash
# 서버에서 이미지 풀 (Docker Hub 사용 시)
docker-compose pull

# 서비스 시작
docker-compose up -d
```

## 🔄 서비스 관리

### 서비스 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 서비스 로그 확인
docker-compose logs

# 특정 서비스 로그 확인
docker-compose logs auth
docker-compose logs -f user  # 실시간 로그

# 최근 100줄만 보기
docker-compose logs --tail=100 assignment
```

### 서비스 재시작

```bash
# 모든 서비스 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart auth
docker-compose restart user
```

### 서비스 중지

```bash
# 모든 서비스 중지
docker-compose stop

# 특정 서비스만 중지
docker-compose stop file
```

### 서비스 제거

```bash
# 컨테이너만 제거
docker-compose down

# 컨테이너와 볼륨 모두 제거
docker-compose down -v

# 컨테이너, 볼륨, 이미지 모두 제거
docker-compose down -v --rmi all
```

### 서비스 스케일링

```bash
# User 서비스 3개 인스턴스로 확장
docker-compose up -d --scale user=3

# 주의: 포트 충돌 방지를 위해 docker-compose.yml에서 포트 설정 수정 필요
```

## 🏥 헬스 체크

각 서비스의 헬스 체크 엔드포인트:

```bash
# Auth Service
curl http://localhost:3001/health

# User Service
curl http://localhost:3002/health

# Assignment Service
curl http://localhost:3003/health

# File Service
curl http://localhost:3004/health

# Realtime Service
curl http://localhost:3005/health
```

## 🔍 모니터링

### 컨테이너 리소스 사용량 확인

```bash
# 실시간 리소스 사용량
docker stats

# 특정 컨테이너만 확인
docker stats services-auth-1 services-user-1
```

### 컨테이너 내부 접속

```bash
# Auth 서비스 컨테이너 접속
docker-compose exec auth sh

# 컨테이너 내부에서 명령 실행
docker-compose exec auth node -v
docker-compose exec auth npm list
```

## 🐛 트러블슈팅

### 포트 충돌 문제

```bash
# 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3001

# 프로세스 종료 (관리자 권한 필요)
taskkill /PID <프로세스ID> /F
```

### 빌드 실패

```bash
# 캐시 없이 다시 빌드
docker-compose build --no-cache

# 특정 서비스만 재빌드
docker-compose build --no-cache auth
```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 오류만 필터링
docker-compose logs | grep -i error

# 특정 시간 이후 로그
docker-compose logs --since 30m
```

### 네트워크 문제

```bash
# 네트워크 확인
docker network ls

# 네트워크 상세 정보
docker network inspect fairschool-network

# 네트워크 재생성
docker-compose down
docker-compose up -d
```

### 디스크 공간 정리

```bash
# 사용하지 않는 이미지, 컨테이너, 볼륨 정리
docker system prune -a

# 볼륨도 함께 정리
docker system prune -a --volumes
```

### MongoDB 연결 문제

```bash
# .env 파일의 MONGODB_URI 확인
cat .env | grep MONGODB_URI

# 컨테이너에서 MongoDB 연결 테스트
docker-compose exec auth node -e "console.log(process.env.MONGODB_URI)"
```

## 📊 서비스 포트 맵핑

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Auth | 3001 | 인증 및 권한 관리 |
| User | 3002 | 사용자 및 학교 관리 |
| Assignment | 3003 | 과제 관리 |
| File | 3004 | 파일 업로드/다운로드 |
| Realtime | 3005 | 실시간 통신 (WebSocket) |

## 🔐 보안 권장사항

1. **JWT 시크릿 변경**: 프로덕션 환경에서는 반드시 강력한 랜덤 문자열 사용
2. **환경 변수 보호**: `.env` 파일을 Git에 커밋하지 않기 (`.gitignore`에 추가됨)
3. **CORS 설정**: `CORS_ORIGIN`을 실제 프론트엔드 도메인으로 제한
4. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용 (Nginx 리버스 프록시 권장)
5. **AWS 자격증명**: IAM 사용자에게 S3 버킷에 대한 최소 권한만 부여

## 🚀 CI/CD 배포

### GitHub Actions 예제

`.github/workflows/deploy.yml` 파일을 생성하여 자동 배포 설정 가능:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push images
        run: |
          docker-compose build
          docker-compose push
      - name: Deploy to server
        run: |
          # SSH로 서버 접속하여 배포
          ssh user@your-server 'cd /path/to/project && docker-compose pull && docker-compose up -d'
```

## 📝 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [프로젝트 README](./README.md)
- [아키텍처 문서](./ARCHITECTURE.md)
- [API 테스트 가이드](./API_TEST.md)

## 💡 팁

1. **개발 환경**: `npm run dev:all`을 사용하여 로컬에서 개발
2. **프로덕션 테스트**: Docker Compose로 프로덕션 환경 시뮬레이션
3. **로그 모니터링**: `docker-compose logs -f`로 실시간 로그 확인
4. **백업**: MongoDB 데이터는 정기적으로 백업
5. **업데이트**: 이미지 업데이트 시 `docker-compose pull && docker-compose up -d`

---

문제가 발생하면 이슈를 등록하거나 팀에 문의하세요.

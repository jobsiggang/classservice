# FairProject Docker 배포 완료 ✅

Docker 마이크로서비스 배포를 위한 모든 설정이 완료되었습니다!

## 📦 생성된 파일

1. **`.env`** - 환경 변수 설정 파일 (이미 존재)
2. **`.dockerignore`** - Docker 빌드 최적화 파일 (새로 생성)
3. **`DOCKER_GUIDE.md`** - 상세 배포 가이드 (업데이트)
4. **`DOCKER_QUICKSTART.md`** - 빠른 시작 가이드 (새로 생성)
5. **`deploy.ps1`** - Windows PowerShell 배포 스크립트 (새로 생성)
6. **`deploy.sh`** - Linux/Mac Bash 배포 스크립트 (새로 생성)

## 🚀 바로 배포하기

### Windows (PowerShell)

```powershell
# 1. 환경 변수 확인 및 수정
notepad .env

# 2. 배포 실행
.\deploy.ps1 deploy
```

### Linux/Mac (Bash)

```bash
# 1. 실행 권한 부여
chmod +x deploy.sh

# 2. 환경 변수 확인 및 수정
nano .env

# 3. 배포 실행
./deploy.sh deploy
```

## ⚙️ 주요 설정 확인 사항

배포 전에 `.env` 파일에서 다음 값들을 확인하세요:

### 필수 수정 항목 🔴

```env
# JWT 시크릿 (보안을 위해 반드시 변경!)
JWT_SECRET=<강력한-랜덤-문자열>
JWT_REFRESH_SECRET=<다른-강력한-랜덤-문자열>

# AWS S3 설정 (파일 서비스 사용 시)
AWS_ACCESS_KEY_ID=<실제-AWS-키>
AWS_SECRET_ACCESS_KEY=<실제-AWS-시크릿>
AWS_S3_BUCKET=<버킷-이름>
```

### 선택 수정 항목 🟡

```env
# MongoDB URI (필요 시 변경)
MONGODB_URI=mongodb+srv://...

# CORS 설정 (프론트엔드 도메인)
CORS_ORIGIN=http://localhost:3000
```

## 📊 배포 후 확인

배포가 완료되면 다음 URL에서 각 서비스를 확인할 수 있습니다:

- **Auth Service**: http://localhost:3001/health
- **User Service**: http://localhost:3002/health
- **Assignment Service**: http://localhost:3003/health
- **File Service**: http://localhost:3004/health
- **Realtime Service**: http://localhost:3005/health

## 🎯 다음 단계

1. **서비스 상태 확인**
   ```powershell
   # Windows
   .\deploy.ps1 ps
   
   # Linux/Mac
   ./deploy.sh ps
   ```

2. **로그 모니터링**
   ```powershell
   # Windows
   .\deploy.ps1 logs
   
   # Linux/Mac
   ./deploy.sh logs
   ```

3. **API 테스트**
   - [API_TEST.md](./API_TEST.md) 참조

## 📚 문서

- **빠른 시작**: [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)
- **상세 가이드**: [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)
- **아키텍처**: [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🆘 도움말

스크립트 사용법:

```powershell
# Windows
.\deploy.ps1 -Help

# Linux/Mac
./deploy.sh help
```

---

배포 준비가 완료되었습니다! 🎉

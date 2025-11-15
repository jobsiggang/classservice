# Docker 빠른 시작 가이드

FairProject 마이크로서비스를 Docker로 빠르게 시작하는 방법입니다.

## ⚡ 빠른 시작 (5분)

### 1. 환경 변수 설정

`.env` 파일이 이미 존재하지만, 프로덕션 배포 시 다음 값들을 반드시 수정하세요:

```bash
# Windows PowerShell
notepad .env

# Linux/Mac
nano .env
```

**필수 수정 사항:**
- `JWT_SECRET`: 강력한 랜덤 문자열로 변경
- `JWT_REFRESH_SECRET`: 다른 강력한 랜덤 문자열로 변경
- `AWS_ACCESS_KEY_ID`: 실제 AWS 키 입력
- `AWS_SECRET_ACCESS_KEY`: 실제 AWS 시크릿 키 입력

### 2. 배포 스크립트 실행

#### Windows (PowerShell)

```powershell
# 한 번에 배포
.\deploy.ps1 deploy

# 또는 단계별 실행
.\deploy.ps1 build      # 이미지 빌드
.\deploy.ps1 up -Detach # 서비스 시작
```

#### Linux/Mac (Bash)

```bash
# 실행 권한 부여 (최초 1회만)
chmod +x deploy.sh

# 한 번에 배포
./deploy.sh deploy

# 또는 단계별 실행
./deploy.sh build  # 이미지 빌드
./deploy.sh up     # 서비스 시작
```

### 3. 서비스 확인

배포 후 다음 URL에서 서비스를 확인할 수 있습니다:

- **Auth Service**: http://localhost:3001/health
- **User Service**: http://localhost:3002/health
- **Assignment Service**: http://localhost:3003/health
- **File Service**: http://localhost:3004/health
- **Realtime Service**: http://localhost:3005/health

## 🔧 주요 명령어

### Windows PowerShell

```powershell
.\deploy.ps1 deploy              # 전체 배포
.\deploy.ps1 up -Detach          # 백그라운드 시작
.\deploy.ps1 logs                # 전체 로그 보기
.\deploy.ps1 logs -Service auth  # 특정 서비스 로그
.\deploy.ps1 restart             # 전체 재시작
.\deploy.ps1 down                # 전체 중지
.\deploy.ps1 ps                  # 상태 확인
.\deploy.ps1 clean               # 리소스 정리
```

### Linux/Mac Bash

```bash
./deploy.sh deploy          # 전체 배포
./deploy.sh up              # 서비스 시작
./deploy.sh logs            # 전체 로그 보기
./deploy.sh logs auth       # 특정 서비스 로그
./deploy.sh restart         # 전체 재시작
./deploy.sh down            # 전체 중지
./deploy.sh ps              # 상태 확인
./deploy.sh clean           # 리소스 정리
```

### Docker Compose 직접 사용

```bash
# 모든 서비스 빌드 및 시작
docker-compose up -d --build

# 특정 서비스만 시작
docker-compose up -d auth user

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down

# 상태 확인
docker-compose ps
```

## 📊 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| Auth | 3001 | http://localhost:3001 |
| User | 3002 | http://localhost:3002 |
| Assignment | 3003 | http://localhost:3003 |
| File | 3004 | http://localhost:3004 |
| Realtime | 3005 | http://localhost:3005 |

## 🐛 문제 해결

### 포트가 이미 사용 중

```powershell
# Windows: 포트 사용 프로세스 확인
netstat -ano | findstr :3001

# 프로세스 종료 (관리자 권한)
taskkill /PID <프로세스ID> /F
```

```bash
# Linux/Mac: 포트 사용 프로세스 확인
lsof -i :3001

# 프로세스 종료
kill -9 <PID>
```

### 빌드 오류

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 기존 컨테이너/이미지 모두 제거 후 재시작
docker-compose down -v --rmi all
docker-compose up -d --build
```

### MongoDB 연결 오류

1. `.env` 파일의 `MONGODB_URI` 확인
2. MongoDB 클러스터가 실행 중인지 확인
3. IP 화이트리스트 설정 확인

### 디스크 공간 부족

```bash
# 사용하지 않는 Docker 리소스 정리
docker system prune -a --volumes
```

## 📚 추가 문서

- 상세 배포 가이드: [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)
- 아키텍처 문서: [ARCHITECTURE.md](./ARCHITECTURE.md)
- API 테스트: [API_TEST.md](./API_TEST.md)

## 💡 팁

1. **개발 환경**: Docker 대신 `npm run dev:all` 사용 권장
2. **로그 모니터링**: `docker-compose logs -f --tail=100` 으로 최근 로그만 확인
3. **리소스 확인**: `docker stats` 로 실시간 리소스 사용량 모니터링
4. **백업**: 중요한 데이터는 정기적으로 백업
5. **보안**: JWT 시크릿은 절대 Git에 커밋하지 않기

---

빠른 시작에 문제가 있으면 [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)를 참조하세요.

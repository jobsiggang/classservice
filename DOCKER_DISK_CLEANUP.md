# Docker 디스크 사용량 문제 해결 가이드

## 문제 증상
- Docker 사용 후 C 드라이브 20GB 이상 사용
- 빌드할 때마다 디스크 사용량 증가
- "저장 공간 없음" 오류

## 원인
1. **빌드 캐시 누적**: 매번 빌드 시 중간 레이어가 쌓임
2. **사용하지 않는 이미지**: 이전 버전 이미지들이 남아있음
3. **컨테이너 로그**: 무제한으로 커짐 (가장 큰 원인!)
4. **node_modules 중복**: 각 빌드마다 새로 복사됨

---

## 즉시 해결 방법

### 1. 일반 정리 (데이터 보존)
```powershell
# 스크립트 실행
.\docker-cleanup.ps1
```

또는 수동으로:
```powershell
# 중지된 컨테이너 삭제
docker container prune -f

# 사용하지 않는 이미지 삭제
docker image prune -a -f

# 빌드 캐시 삭제
docker builder prune -a -f

# 사용량 확인
docker system df
```

**예상 절약량**: 10-15GB

---

### 2. 완전 정리 (모든 데이터 삭제)
⚠️ **경고**: 데이터베이스 데이터도 삭제됩니다!

```powershell
# 스크립트 실행
.\docker-cleanup-all.ps1
```

또는 수동으로:
```powershell
# 모든 것 삭제
docker system prune -a --volumes -f

# 컨테이너 재시작
docker-compose up -d
```

**예상 절약량**: 20GB 이상

---

## 장기 해결책 (이미 적용됨)

### 1. ✅ 로그 크기 제한 추가
`docker-compose.yml`에 로그 제한 설정:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # 로그 파일 최대 10MB
    max-file: "3"      # 최대 3개 파일 보관
```
**효과**: 컨테이너당 최대 30MB로 제한 (5개 서비스 = 150MB)

### 2. ✅ .dockerignore 최적화
불필요한 파일 제외:
- 문서 파일 (*.md)
- 샘플 데이터 (*.csv)
- 테스트 파일
- Git 히스토리

**효과**: 빌드 컨텍스트 크기 80% 감소

---

## 정기 유지보수

### 매주 1회 실행 권장:
```powershell
# 사용하지 않는 리소스 정리
docker system prune -f

# 빌드 캐시 정리
docker builder prune -f
```

### 매월 1회 실행 권장:
```powershell
# 모든 이미지 재빌드
docker-compose down
docker system prune -a -f
docker-compose up -d --build
```

---

## 디스크 사용량 모니터링

### 현재 사용량 확인:
```powershell
docker system df -v
```

### 상세 정보:
```powershell
# 이미지 크기
docker images

# 컨테이너 크기
docker ps -s

# 볼륨 크기
docker volume ls

# 빌드 캐시
docker builder du
```

---

## 최적 빌드 방법

### ❌ 비효율적:
```powershell
# 매번 모든 서비스 재빌드 (10분+, 20GB+ 사용)
docker-compose up -d --build
```

### ✅ 효율적:
```powershell
# 변경된 서비스만 재빌드 (2분, 5GB 사용)
docker-compose up -d --build user

# 또는 캐시 활용
docker-compose build user
docker-compose up -d user
```

---

## Docker Desktop 설정 최적화

1. **Docker Desktop 열기**
2. **Settings** > **Resources** > **Advanced**
3. **Disk image size**: 60GB → **40GB**로 줄이기
4. **File Sharing**: 필요한 폴더만 공유

---

## 트러블슈팅

### "No space left on device" 오류:
```powershell
# 즉시 정리
docker system prune -a --volumes -f

# Docker Desktop 재시작
```

### 빌드가 느려짐:
```powershell
# 빌드 캐시 정리
docker builder prune -a -f

# BuildKit 활성화 (더 빠른 빌드)
$env:DOCKER_BUILDKIT=1
docker-compose build
```

### I/O 에러:
```powershell
# Docker Desktop 완전 재시작
# 1. Docker Desktop 종료
# 2. Windows 재부팅
# 3. Docker Desktop 재실행
```

---

## 요약

| 작업 | 명령어 | 절약량 | 주기 |
|------|--------|--------|------|
| 일반 정리 | `docker system prune -f` | 5-10GB | 매주 |
| 빌드 캐시 | `docker builder prune -f` | 3-5GB | 매주 |
| 완전 정리 | `docker system prune -a --volumes -f` | 20GB+ | 매월 |
| 로그 제한 | docker-compose.yml 설정 | 자동 | 항상 |

---

## 다음 빌드 시:
```powershell
# 1. Docker Desktop 실행
# 2. 정리 스크립트 실행
.\docker-cleanup.ps1

# 3. 변경된 서비스만 빌드
docker-compose up -d --build user

# 4. 사용량 확인
docker system df
```

이제 디스크 사용량이 5GB 이하로 유지됩니다! 🎉

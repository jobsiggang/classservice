# 외부 접속 배포 가이드

FairProject 마이크로서비스를 인터넷에서 접속 가능하도록 배포하는 방법입니다.

## 🌍 배포 방법 비교

| 방법 | 난이도 | 비용 | 추천 용도 |
|------|--------|------|-----------|
| **로컬 네트워크** | ⭐ 쉬움 | 무료 | 개발/테스트 |
| **포트포워딩** | ⭐⭐ 중간 | 무료 | 소규모 테스트 |
| **클라우드 (AWS/Azure)** | ⭐⭐⭐ 어려움 | 유료 | 프로덕션 |
| **Railway/Render** | ⭐⭐ 중간 | 무료/유료 | 빠른 배포 |

---

## 1️⃣ 로컬 네트워크 접속 (같은 Wi-Fi)

### 설정 방법

1. **방화벽 포트 열기** (관리자 권한 PowerShell):
```powershell
.\setup-firewall.ps1
```

2. **접속 테스트**
   - 같은 Wi-Fi의 다른 기기에서:
   ```
   http://172.16.11.220:3001/health
   ```

### 장점
- ✅ 설정 간단
- ✅ 무료
- ✅ 빠른 속도

### 단점
- ❌ 같은 네트워크에서만 접속 가능
- ❌ 인터넷 접속 불가

---

## 2️⃣ 포트포워딩 (공인 IP로 접속)

### 설정 방법

1. **공인 IP 확인**
   - https://whatismyipaddress.com 방문

2. **공유기 설정**
   - 공유기 관리 페이지 접속 (보통 192.168.0.1 또는 192.168.1.1)
   - 포트포워딩 설정:
     ```
     외부 포트 → 내부 IP → 내부 포트
     3001      → 172.16.11.220 → 3001
     3002      → 172.16.11.220 → 3002
     3003      → 172.16.11.220 → 3003
     3004      → 172.16.11.220 → 3004
     3005      → 172.16.11.220 → 3005
     ```

3. **Docker Compose 수정** (.env 파일):
   ```env
   CORS_ORIGIN=http://YOUR_PUBLIC_IP:3000
   ```

4. **방화벽 설정**
   ```powershell
   .\setup-firewall.ps1
   ```

5. **접속 테스트**
   ```
   http://YOUR_PUBLIC_IP:3001/health
   ```

### 장점
- ✅ 인터넷에서 접속 가능
- ✅ 무료

### 단점
- ❌ 보안 취약 (포트 노출)
- ❌ 동적 IP 변경 시 재설정 필요
- ❌ ISP가 포트포워딩 차단할 수 있음

---

## 3️⃣ 클라우드 배포 (권장)

### A. AWS EC2

1. **EC2 인스턴스 생성**
   - Ubuntu 22.04 LTS
   - t3.medium 이상 (2GB RAM+)
   - 보안 그룹: 포트 3001-3005 열기

2. **Docker 설치**
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **코드 배포**
   ```bash
   git clone https://github.com/jobsiggang/classservice.git
   cd classservice
   ```

4. **환경 변수 설정**
   ```bash
   nano .env
   # 공인 IP 또는 도메인으로 CORS_ORIGIN 설정
   ```

5. **배포**
   ```bash
   sudo docker-compose up -d --build
   ```

6. **접속**
   ```
   http://YOUR_EC2_PUBLIC_IP:3001
   ```

### 비용
- t3.medium: 약 $30-40/월
- 프리티어: 12개월 무료 (t2.micro)

---

### B. Railway (가장 쉬운 방법)

1. **Railway 가입**
   - https://railway.app 회원가입

2. **GitHub 저장소 연결**
   - New Project → Deploy from GitHub repo
   - classservice 선택

3. **환경 변수 설정**
   Railway 대시보드에서 각 서비스별로:
   ```
   MONGODB_URI=your-mongodb-uri
   JWT_SECRET=your-secret
   AWS_ACCESS_KEY_ID=your-key
   ```

4. **자동 배포**
   - Railway가 자동으로 Dockerfile 인식하여 배포
   - 각 서비스마다 고유 URL 생성

5. **접속**
   ```
   https://auth-production-xxxx.up.railway.app
   https://user-production-xxxx.up.railway.app
   ```

### 비용
- 무료 플랜: $5 크레딧/월
- Pro 플랜: $20/월

---

### C. Render

1. **Render 가입**
   - https://render.com

2. **Blueprint 생성**
   - New → Blueprint
   - GitHub 저장소 연결

3. **render.yaml 파일 생성** (프로젝트 루트):
   ```yaml
   services:
     - type: web
       name: auth-service
       env: docker
       dockerfilePath: ./Dockerfile.auth
       envVars:
         - key: PORT
           value: 3001
         - key: MONGODB_URI
           fromDatabase:
             name: mongodb
             property: connectionString
   
     - type: web
       name: user-service
       env: docker
       dockerfilePath: ./Dockerfile.user
       envVars:
         - key: PORT
           value: 3002
   ```

4. **환경 변수 설정**
5. **자동 배포**

### 비용
- 무료 플랜: 750시간/월
- Starter: $7/서비스/월

---

## 4️⃣ Nginx 리버스 프록시 (프로덕션 권장)

외부에서 단일 도메인으로 모든 서비스 접근:

### 설정

1. **Nginx 설치**
   ```bash
   sudo apt install nginx
   ```

2. **Nginx 설정** (/etc/nginx/sites-available/fairproject):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location /api/auth/ {
           proxy_pass http://localhost:3001/api/auth/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/user/ {
           proxy_pass http://localhost:3002/api/user/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/assignment/ {
           proxy_pass http://localhost:3003/api/assignment/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/file/ {
           proxy_pass http://localhost:3004/api/file/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /ws {
           proxy_pass http://localhost:3005/ws;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

3. **HTTPS 설정** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **Nginx 재시작**
   ```bash
   sudo systemctl restart nginx
   ```

5. **접속**
   ```
   https://your-domain.com/api/auth/login
   https://your-domain.com/api/user/schools
   ```

---

## 🎯 추천 방법

### 개발/테스트
1. **로컬 네트워크**: 방화벽만 설정
2. **Railway**: 빠른 외부 테스트용

### 프로덕션
1. **AWS EC2 + Nginx + HTTPS**: 완전한 제어
2. **Railway/Render**: 빠른 배포, 관리 편함

---

## 🔐 보안 체크리스트

배포 전 필수 확인사항:

- [ ] JWT_SECRET 변경 (강력한 랜덤 문자열)
- [ ] JWT_REFRESH_SECRET 변경
- [ ] CORS_ORIGIN을 실제 프론트엔드 도메인으로 제한
- [ ] .env 파일 Git에서 제외 (.gitignore 확인)
- [ ] HTTPS 사용 (프로덕션)
- [ ] MongoDB 접속 IP 화이트리스트 설정
- [ ] 방화벽 규칙 최소화 (필요한 포트만)
- [ ] 정기 백업 설정
- [ ] 로그 모니터링 설정

---

## 📊 배포 후 테스트

```bash
# 헬스 체크
curl https://your-domain.com/api/auth/health
curl https://your-domain.com/api/user/health

# API 테스트 (API_TEST.md 참조)
curl -X POST https://your-domain.com/api/user/schools \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "테스트학교",
    "adminName": "관리자",
    "adminEmail": "admin@test.com",
    "adminPassword": "Admin123!"
  }'
```

---

## 🆘 문제 해결

### 접속 안됨
1. 방화벽 확인: `netstat -an | findstr :3001`
2. Docker 실행 확인: `docker-compose ps`
3. 로그 확인: `docker-compose logs`

### CORS 에러
- .env의 CORS_ORIGIN 확인
- 프론트엔드 도메인과 일치하는지 확인

### SSL 인증서 오류
- certbot 갱신: `sudo certbot renew`
- Nginx 설정 확인

---

## 💡 다음 단계

1. 도메인 구매 (선택)
2. CI/CD 파이프라인 설정 (GitHub Actions)
3. 모니터링 설정 (Prometheus, Grafana)
4. 로그 수집 (ELK Stack)
5. 자동 스케일링 설정

---

문의사항이 있으면 이슈를 등록하세요!

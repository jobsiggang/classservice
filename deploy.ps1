# FairProject Docker Deployment Script for Windows PowerShell
# 사용법: .\deploy.ps1 [command] [options]

param(
    [Parameter(Position=0)]
    [ValidateSet('build', 'up', 'down', 'restart', 'logs', 'ps', 'clean', 'deploy')]
    [string]$Command = 'up',
    
    [Parameter()]
    [switch]$Build,
    
    [Parameter()]
    [switch]$Detach,
    
    [Parameter()]
    [string]$Service = '',
    
    [Parameter()]
    [switch]$Help
)

# 색상 출력 함수
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White'
    )
    Write-Host $Message -ForegroundColor $Color
}

# 도움말 표시
function Show-Help {
    Write-ColorOutput "`n=== FairProject Docker Deployment Script ===" "Cyan"
    Write-ColorOutput "`n사용법:" "Yellow"
    Write-ColorOutput "  .\deploy.ps1 [command] [options]`n"
    
    Write-ColorOutput "명령어:" "Yellow"
    Write-ColorOutput "  build    - Docker 이미지 빌드"
    Write-ColorOutput "  up       - 서비스 시작 (기본값)"
    Write-ColorOutput "  down     - 서비스 중지 및 제거"
    Write-ColorOutput "  restart  - 서비스 재시작"
    Write-ColorOutput "  logs     - 로그 확인"
    Write-ColorOutput "  ps       - 실행 중인 컨테이너 확인"
    Write-ColorOutput "  clean    - 사용하지 않는 리소스 정리"
    Write-ColorOutput "  deploy   - 프로덕션 배포 (빌드 + 시작)`n"
    
    Write-ColorOutput "옵션:" "Yellow"
    Write-ColorOutput "  -Build      - up 명령 시 이미지 빌드"
    Write-ColorOutput "  -Detach     - 백그라운드에서 실행"
    Write-ColorOutput "  -Service    - 특정 서비스만 대상 (auth, user, assignment, file, realtime)"
    Write-ColorOutput "  -Help       - 도움말 표시`n"
    
    Write-ColorOutput "예제:" "Yellow"
    Write-ColorOutput "  .\deploy.ps1 build                    # 모든 이미지 빌드"
    Write-ColorOutput "  .\deploy.ps1 up -Detach              # 백그라운드에서 시작"
    Write-ColorOutput "  .\deploy.ps1 up -Build -Detach       # 빌드 후 백그라운드 시작"
    Write-ColorOutput "  .\deploy.ps1 logs -Service auth      # Auth 서비스 로그 확인"
    Write-ColorOutput "  .\deploy.ps1 restart -Service user   # User 서비스 재시작"
    Write-ColorOutput "  .\deploy.ps1 deploy                  # 프로덕션 배포`n"
}

if ($Help) {
    Show-Help
    exit 0
}

# .env 파일 확인
if (-not (Test-Path ".env")) {
    Write-ColorOutput "⚠️  .env 파일이 없습니다. .env.example을 복사하여 .env 파일을 생성하세요." "Red"
    Write-ColorOutput "   cp .env.example .env" "Yellow"
    exit 1
}

# Docker 설치 확인
try {
    docker --version | Out-Null
} catch {
    Write-ColorOutput "❌ Docker가 설치되어 있지 않습니다." "Red"
    Write-ColorOutput "   https://www.docker.com/products/docker-desktop 에서 Docker Desktop을 설치하세요." "Yellow"
    exit 1
}

# Docker Compose 설치 확인
try {
    docker-compose --version | Out-Null
} catch {
    Write-ColorOutput "❌ Docker Compose가 설치되어 있지 않습니다." "Red"
    exit 1
}

Write-ColorOutput "`n🚀 FairProject Docker Deployment" "Cyan"
Write-ColorOutput "================================`n" "Cyan"

# 명령 실행
switch ($Command) {
    'build' {
        Write-ColorOutput "📦 Docker 이미지 빌드 중..." "Green"
        if ($Service) {
            docker-compose build $Service
        } else {
            docker-compose build
        }
        Write-ColorOutput "✅ 빌드 완료!" "Green"
    }
    
    'up' {
        $args = @()
        if ($Build) { $args += '--build' }
        if ($Detach) { $args += '-d' }
        if ($Service) { $args += $Service }
        
        Write-ColorOutput "🚀 서비스 시작 중..." "Green"
        docker-compose up @args
        
        if ($Detach) {
            Write-ColorOutput "`n✅ 서비스가 백그라운드에서 시작되었습니다!" "Green"
            Write-ColorOutput "`n서비스 포트:" "Yellow"
            Write-ColorOutput "  Auth Service:       http://localhost:3001" "Cyan"
            Write-ColorOutput "  User Service:       http://localhost:3002" "Cyan"
            Write-ColorOutput "  Assignment Service: http://localhost:3003" "Cyan"
            Write-ColorOutput "  File Service:       http://localhost:3004" "Cyan"
            Write-ColorOutput "  Realtime Service:   http://localhost:3005" "Cyan"
            Write-ColorOutput "`n로그 확인: .\deploy.ps1 logs" "Yellow"
        }
    }
    
    'down' {
        Write-ColorOutput "🛑 서비스 중지 중..." "Yellow"
        docker-compose down
        Write-ColorOutput "✅ 서비스가 중지되었습니다!" "Green"
    }
    
    'restart' {
        Write-ColorOutput "🔄 서비스 재시작 중..." "Yellow"
        if ($Service) {
            docker-compose restart $Service
            Write-ColorOutput "✅ $Service 서비스가 재시작되었습니다!" "Green"
        } else {
            docker-compose restart
            Write-ColorOutput "✅ 모든 서비스가 재시작되었습니다!" "Green"
        }
    }
    
    'logs' {
        Write-ColorOutput "📋 로그 확인..." "Cyan"
        if ($Service) {
            docker-compose logs -f $Service
        } else {
            docker-compose logs -f
        }
    }
    
    'ps' {
        Write-ColorOutput "📊 실행 중인 컨테이너:" "Cyan"
        docker-compose ps
    }
    
    'clean' {
        Write-ColorOutput "🧹 사용하지 않는 리소스 정리 중..." "Yellow"
        docker system prune -f
        Write-ColorOutput "✅ 정리 완료!" "Green"
    }
    
    'deploy' {
        Write-ColorOutput "🚀 프로덕션 배포 시작..." "Cyan"
        
        # 환경 변수 확인
        Write-ColorOutput "`n1️⃣  환경 변수 확인 중..." "Yellow"
        $envContent = Get-Content .env -Raw
        if ($envContent -match "your-super-secret-jwt-key-change-this-in-production") {
            Write-ColorOutput "⚠️  경고: JWT_SECRET이 기본값입니다. 보안을 위해 변경하세요!" "Red"
            $continue = Read-Host "계속하시겠습니까? (y/N)"
            if ($continue -ne 'y') {
                exit 0
            }
        }
        
        # 이미지 빌드
        Write-ColorOutput "`n2️⃣  Docker 이미지 빌드 중..." "Yellow"
        docker-compose build
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ 빌드 실패!" "Red"
            exit 1
        }
        Write-ColorOutput "✅ 빌드 완료!" "Green"
        
        # 기존 컨테이너 중지
        Write-ColorOutput "`n3️⃣  기존 컨테이너 중지 중..." "Yellow"
        docker-compose down
        
        # 서비스 시작
        Write-ColorOutput "`n4️⃣  서비스 시작 중..." "Yellow"
        docker-compose up -d
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ 서비스 시작 실패!" "Red"
            exit 1
        }
        
        # 헬스 체크
        Write-ColorOutput "`n5️⃣  헬스 체크 중..." "Yellow"
        Start-Sleep -Seconds 5
        
        $services = @(
            @{Name="Auth"; Port=3001},
            @{Name="User"; Port=3002},
            @{Name="Assignment"; Port=3003},
            @{Name="File"; Port=3004},
            @{Name="Realtime"; Port=3005}
        )
        
        foreach ($svc in $services) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$($svc.Port)/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-ColorOutput "  ✅ $($svc.Name) Service: OK" "Green"
                } else {
                    Write-ColorOutput "  ⚠️  $($svc.Name) Service: 응답 없음" "Yellow"
                }
            } catch {
                Write-ColorOutput "  ⚠️  $($svc.Name) Service: 연결 실패" "Yellow"
            }
        }
        
        Write-ColorOutput "`n✅ 배포 완료!" "Green"
        Write-ColorOutput "`n서비스 URL:" "Cyan"
        Write-ColorOutput "  Auth:       http://localhost:3001" "White"
        Write-ColorOutput "  User:       http://localhost:3002" "White"
        Write-ColorOutput "  Assignment: http://localhost:3003" "White"
        Write-ColorOutput "  File:       http://localhost:3004" "White"
        Write-ColorOutput "  Realtime:   http://localhost:3005" "White"
        Write-ColorOutput "`n로그 확인: .\deploy.ps1 logs" "Yellow"
        Write-ColorOutput "서비스 상태: .\deploy.ps1 ps`n" "Yellow"
    }
    
    default {
        Write-ColorOutput "❌ 알 수 없는 명령: $Command" "Red"
        Show-Help
        exit 1
    }
}

Write-ColorOutput ""

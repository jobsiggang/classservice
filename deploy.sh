#!/bin/bash

# FairProject Docker Deployment Script for Linux/Mac
# 사용법: ./deploy.sh [command] [options]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 도움말 표시
show_help() {
    echo -e "${CYAN}"
    echo "=== FairProject Docker Deployment Script ==="
    echo -e "${NC}"
    echo -e "${YELLOW}사용법:${NC}"
    echo "  ./deploy.sh [command] [service]"
    echo ""
    echo -e "${YELLOW}명령어:${NC}"
    echo "  build    - Docker 이미지 빌드"
    echo "  up       - 서비스 시작"
    echo "  down     - 서비스 중지 및 제거"
    echo "  restart  - 서비스 재시작"
    echo "  logs     - 로그 확인"
    echo "  ps       - 실행 중인 컨테이너 확인"
    echo "  clean    - 사용하지 않는 리소스 정리"
    echo "  deploy   - 프로덕션 배포 (빌드 + 시작)"
    echo "  help     - 도움말 표시"
    echo ""
    echo -e "${YELLOW}서비스 (옵션):${NC}"
    echo "  auth       - Auth 서비스만"
    echo "  user       - User 서비스만"
    echo "  assignment - Assignment 서비스만"
    echo "  file       - File 서비스만"
    echo "  realtime   - Realtime 서비스만"
    echo ""
    echo -e "${YELLOW}예제:${NC}"
    echo "  ./deploy.sh build                # 모든 이미지 빌드"
    echo "  ./deploy.sh up                   # 모든 서비스 시작"
    echo "  ./deploy.sh up auth              # Auth 서비스만 시작"
    echo "  ./deploy.sh logs user            # User 서비스 로그 확인"
    echo "  ./deploy.sh restart assignment   # Assignment 서비스 재시작"
    echo "  ./deploy.sh deploy               # 프로덕션 배포"
    echo ""
}

# .env 파일 확인
check_env() {
    if [ ! -f .env ]; then
        echo -e "${RED}⚠️  .env 파일이 없습니다.${NC}"
        echo -e "${YELLOW}   .env.example을 복사하여 .env 파일을 생성하세요.${NC}"
        echo "   cp .env.example .env"
        exit 1
    fi
}

# Docker 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
        echo -e "${YELLOW}   https://docs.docker.com/get-docker/ 에서 Docker를 설치하세요.${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose가 설치되어 있지 않습니다.${NC}"
        exit 1
    fi
}

# 헬스 체크
health_check() {
    local service_name=$1
    local port=$2
    
    echo -n "  $service_name Service: "
    
    if curl -s -f "http://localhost:$port/health" > /dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  응답 없음${NC}"
        return 1
    fi
}

# 메인 스크립트
COMMAND=${1:-up}
SERVICE=${2:-}

case "$COMMAND" in
    help|-h|--help)
        show_help
        exit 0
        ;;
esac

check_env
check_docker

echo -e "${CYAN}"
echo "🚀 FairProject Docker Deployment"
echo "================================"
echo -e "${NC}"

case "$COMMAND" in
    build)
        echo -e "${GREEN}📦 Docker 이미지 빌드 중...${NC}"
        if [ -n "$SERVICE" ]; then
            docker-compose build "$SERVICE"
        else
            docker-compose build
        fi
        echo -e "${GREEN}✅ 빌드 완료!${NC}"
        ;;
        
    up)
        echo -e "${GREEN}🚀 서비스 시작 중...${NC}"
        if [ -n "$SERVICE" ]; then
            docker-compose up -d "$SERVICE"
        else
            docker-compose up -d
        fi
        echo -e "${GREEN}✅ 서비스가 시작되었습니다!${NC}"
        echo ""
        echo -e "${YELLOW}서비스 포트:${NC}"
        echo -e "${CYAN}  Auth Service:       http://localhost:3001${NC}"
        echo -e "${CYAN}  User Service:       http://localhost:3002${NC}"
        echo -e "${CYAN}  Assignment Service: http://localhost:3003${NC}"
        echo -e "${CYAN}  File Service:       http://localhost:3004${NC}"
        echo -e "${CYAN}  Realtime Service:   http://localhost:3005${NC}"
        echo ""
        echo -e "${YELLOW}로그 확인: ./deploy.sh logs${NC}"
        ;;
        
    down)
        echo -e "${YELLOW}🛑 서비스 중지 중...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ 서비스가 중지되었습니다!${NC}"
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 서비스 재시작 중...${NC}"
        if [ -n "$SERVICE" ]; then
            docker-compose restart "$SERVICE"
            echo -e "${GREEN}✅ $SERVICE 서비스가 재시작되었습니다!${NC}"
        else
            docker-compose restart
            echo -e "${GREEN}✅ 모든 서비스가 재시작되었습니다!${NC}"
        fi
        ;;
        
    logs)
        echo -e "${CYAN}📋 로그 확인...${NC}"
        if [ -n "$SERVICE" ]; then
            docker-compose logs -f "$SERVICE"
        else
            docker-compose logs -f
        fi
        ;;
        
    ps)
        echo -e "${CYAN}📊 실행 중인 컨테이너:${NC}"
        docker-compose ps
        ;;
        
    clean)
        echo -e "${YELLOW}🧹 사용하지 않는 리소스 정리 중...${NC}"
        docker system prune -f
        echo -e "${GREEN}✅ 정리 완료!${NC}"
        ;;
        
    deploy)
        echo -e "${CYAN}🚀 프로덕션 배포 시작...${NC}"
        
        # 환경 변수 확인
        echo ""
        echo -e "${YELLOW}1️⃣  환경 변수 확인 중...${NC}"
        if grep -q "your-super-secret-jwt-key-change-this-in-production" .env; then
            echo -e "${RED}⚠️  경고: JWT_SECRET이 기본값입니다. 보안을 위해 변경하세요!${NC}"
            read -p "계속하시겠습니까? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 0
            fi
        fi
        
        # 이미지 빌드
        echo ""
        echo -e "${YELLOW}2️⃣  Docker 이미지 빌드 중...${NC}"
        docker-compose build
        echo -e "${GREEN}✅ 빌드 완료!${NC}"
        
        # 기존 컨테이너 중지
        echo ""
        echo -e "${YELLOW}3️⃣  기존 컨테이너 중지 중...${NC}"
        docker-compose down
        
        # 서비스 시작
        echo ""
        echo -e "${YELLOW}4️⃣  서비스 시작 중...${NC}"
        docker-compose up -d
        
        # 헬스 체크
        echo ""
        echo -e "${YELLOW}5️⃣  헬스 체크 중...${NC}"
        sleep 5
        
        health_check "Auth" 3001
        health_check "User" 3002
        health_check "Assignment" 3003
        health_check "File" 3004
        health_check "Realtime" 3005
        
        echo ""
        echo -e "${GREEN}✅ 배포 완료!${NC}"
        echo ""
        echo -e "${CYAN}서비스 URL:${NC}"
        echo "  Auth:       http://localhost:3001"
        echo "  User:       http://localhost:3002"
        echo "  Assignment: http://localhost:3003"
        echo "  File:       http://localhost:3004"
        echo "  Realtime:   http://localhost:3005"
        echo ""
        echo -e "${YELLOW}로그 확인: ./deploy.sh logs${NC}"
        echo -e "${YELLOW}서비스 상태: ./deploy.sh ps${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ 알 수 없는 명령: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""

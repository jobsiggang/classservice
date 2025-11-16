# Docker 완전 정리 스크립트 (모든 데이터 삭제)
# 경고: 이 스크립트는 모든 컨테이너, 이미지, 볼륨, 네트워크를 삭제합니다!

Write-Host "========================================" -ForegroundColor Red
Write-Host "경고: 모든 Docker 데이터가 삭제됩니다!" -ForegroundColor Red
Write-Host "- 모든 컨테이너" -ForegroundColor Red
Write-Host "- 모든 이미지" -ForegroundColor Red
Write-Host "- 모든 볼륨 (데이터베이스 데이터 포함)" -ForegroundColor Red
Write-Host "- 모든 네트워크" -ForegroundColor Red
Write-Host "- 모든 빌드 캐시" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red

$confirmation = Read-Host "`n정말 진행하시겠습니까? (yes 입력)"

if ($confirmation -eq "yes") {
    Write-Host "`n정리 시작..." -ForegroundColor Yellow
    
    Write-Host "`n=== 모든 컨테이너 중지 및 삭제 ===" -ForegroundColor Yellow
    docker stop $(docker ps -aq) 2>$null
    docker rm $(docker ps -aq) -f 2>$null
    
    Write-Host "`n=== 모든 이미지 삭제 ===" -ForegroundColor Yellow
    docker rmi $(docker images -aq) -f 2>$null
    
    Write-Host "`n=== 모든 볼륨 삭제 ===" -ForegroundColor Yellow
    docker volume rm $(docker volume ls -q) -f 2>$null
    
    Write-Host "`n=== 모든 네트워크 삭제 ===" -ForegroundColor Yellow
    docker network prune -f
    
    Write-Host "`n=== 빌드 캐시 삭제 ===" -ForegroundColor Yellow
    docker builder prune -a -f
    
    Write-Host "`n=== 시스템 전체 정리 ===" -ForegroundColor Yellow
    docker system prune -a --volumes -f
    
    Write-Host "`n=== 정리 완료! ===" -ForegroundColor Green
    docker system df
    
    Write-Host "`n컨테이너를 다시 시작하려면 'docker-compose up -d'를 실행하세요." -ForegroundColor Cyan
} else {
    Write-Host "`n취소되었습니다." -ForegroundColor Yellow
}

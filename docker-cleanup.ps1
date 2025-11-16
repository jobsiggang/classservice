# Docker 정리 스크립트
# 이 스크립트는 사용하지 않는 Docker 리소스를 정리합니다

Write-Host "=== Docker 디스크 사용량 확인 ===" -ForegroundColor Cyan
docker system df

Write-Host "`n=== 1단계: 중지된 컨테이너 삭제 ===" -ForegroundColor Yellow
docker container prune -f

Write-Host "`n=== 2단계: 사용하지 않는 이미지 삭제 ===" -ForegroundColor Yellow
docker image prune -a -f

Write-Host "`n=== 3단계: 사용하지 않는 볼륨 삭제 ===" -ForegroundColor Yellow
# 주의: 데이터베이스 데이터가 삭제될 수 있습니다!
# docker volume prune -f

Write-Host "`n=== 4단계: 빌드 캐시 삭제 ===" -ForegroundColor Yellow
docker builder prune -a -f

Write-Host "`n=== 5단계: 네트워크 정리 ===" -ForegroundColor Yellow
docker network prune -f

Write-Host "`n=== 정리 완료 후 디스크 사용량 ===" -ForegroundColor Green
docker system df

Write-Host "`n=== 현재 실행 중인 컨테이너 ===" -ForegroundColor Cyan
docker ps

Write-Host "`n정리가 완료되었습니다!" -ForegroundColor Green
Write-Host "주의: 볼륨은 삭제하지 않았습니다. 데이터베이스 데이터를 삭제하려면 'docker volume prune -f'를 실행하세요." -ForegroundColor Red

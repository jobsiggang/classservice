# Windows 방화벽 설정 스크립트
# 관리자 권한으로 PowerShell 실행 필요

# 방화벽 규칙 추가
New-NetFirewallRule -DisplayName "FairProject Auth Service" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "FairProject User Service" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "FairProject Assignment Service" -Direction Inbound -LocalPort 3003 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "FairProject File Service" -Direction Inbound -LocalPort 3004 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "FairProject Realtime Service" -Direction Inbound -LocalPort 3005 -Protocol TCP -Action Allow

Write-Host "✅ 방화벽 규칙이 추가되었습니다!" -ForegroundColor Green
Write-Host ""
Write-Host "로컬 네트워크에서 다음 주소로 접속할 수 있습니다:" -ForegroundColor Cyan
Write-Host "  Auth:       http://172.16.11.220:3001" -ForegroundColor White
Write-Host "  User:       http://172.16.11.220:3002" -ForegroundColor White
Write-Host "  Assignment: http://172.16.11.220:3003" -ForegroundColor White
Write-Host "  File:       http://172.16.11.220:3004" -ForegroundColor White
Write-Host "  Realtime:   http://172.16.11.220:3005" -ForegroundColor White

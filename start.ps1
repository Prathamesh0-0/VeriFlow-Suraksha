# start.ps1
# This script starts both the VeriFlow Backend (FastAPI) and Frontend (Vite)
# in separate windows so you can see their logs independently.

Write-Host "Starting VeriFlow Project..." -ForegroundColor Green

# Start Backend in a new window
Write-Host "Starting Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & '..\gpu-venv\Scripts\python.exe' -m uvicorn main:app --reload"

# Start Frontend in a new window
Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Done! Two new windows should have opened." -ForegroundColor Green
Write-Host "Wait a few seconds for servers to start, then visit http://localhost:5173" -ForegroundColor Yellow

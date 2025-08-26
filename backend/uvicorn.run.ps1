# PowerShell helper to run Uvicorn with venv
# Ensure Python can import the `backend` package by pointing PYTHONPATH to the project root
$projectRoot = (Resolve-Path "$PSScriptRoot\..\").Path
$env:PYTHONPATH = $projectRoot
& "$projectRoot\.venv\Scripts\python.exe" -m uvicorn backend.app.main:app --reload

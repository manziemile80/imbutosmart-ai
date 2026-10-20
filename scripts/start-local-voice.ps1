# Starts the free, self-hosted speech stack used by the voice assistant:
#   - speech-to-text: faster-whisper (local, CPU)
#   - text-to-speech: Windows SAPI via pyttsx3
# Both run locally, so voice works with no paid API key.
#
# Prerequisites (one time):
#   python -m pip install --user "vocal-ai[kokoro]" "av<19"
#   winget install --id=Gyan.FFmpeg -e
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\start-local-voice.ps1
#
# Then these must be set in .env and the dev server restarted:
#   AI_SPEECH_BASE_URL=http://127.0.0.1:8000/v1
#   AI_STT_MODEL=Systran/faster-whisper-tiny
#   AI_TTS_MODEL=pyttsx3

$ErrorActionPreference = "Stop"

# vocal-ai shells out to ffmpeg/ffprobe, so make sure it is on PATH even when the
# current shell predates the winget install.
$ffmpegBin = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty DirectoryName
if ($ffmpegBin) {
  $env:PATH = "$ffmpegBin;$env:PATH"
  Write-Host "ffmpeg: $ffmpegBin" -ForegroundColor DarkGray
} else {
  Write-Warning "ffmpeg not found. Install it with: winget install --id=Gyan.FFmpeg -e"
}

$vocal = Join-Path $env:APPDATA "Python\Python314\Scripts\vocal.exe"
if (-not (Test-Path $vocal)) {
  $vocal = "vocal"
}

Write-Host "Starting local voice server on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

& $vocal serve --host 127.0.0.1 --port 8000

# End-to-end check of the local voice assistant pipeline, mirroring what the
# app's server functions do:
#   1. speech-to-text  (local faster-whisper)
#   2. farmer answer   (local Ollama chat)
#   3. text-to-speech  (local Windows SAPI)
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\test-voice-e2e.ps1

$ErrorActionPreference = "Stop"

$speechUrl = "http://127.0.0.1:8000/v1"
$chatUrl = "http://127.0.0.1:11434/v1"
$sttModel = "Systran/faster-whisper-tiny"
$chatModel = "qwen2.5:3b"
$ttsModel = "pyttsx3"

$tmpWav = Join-Path $env:TEMP "e2e_question.wav"
$tmpAnswer = Join-Path $env:TEMP "e2e_answer.wav"

Write-Host "`n[1/3] Text-to-speech: build a spoken question to transcribe" -ForegroundColor Cyan
$qBody = @{ model = $ttsModel; input = "My maize leaves are turning yellow after heavy rain. What should I do?"; response_format = "wav" } | ConvertTo-Json
Invoke-WebRequest "$speechUrl/audio/speech" -Method Post -ContentType "application/json" -Body $qBody -OutFile $tmpWav -TimeoutSec 120
Write-Host "      wrote $((Get-Item $tmpWav).Length) bytes"

Write-Host "[2/3] Speech-to-text: transcribe the question" -ForegroundColor Cyan
$stt = curl.exe -s -X POST "$speechUrl/audio/transcriptions" -F "file=@$tmpWav" -F "model=$sttModel" -F "response_format=json" --max-time 300 | ConvertFrom-Json
$question = $stt.text
Write-Host "      transcribed: $question" -ForegroundColor Yellow

if (-not $question) { throw "STT returned no text" }

Write-Host "[3/3] Chat (local LLM) then speak the answer" -ForegroundColor Cyan
$sys = "You are the voice farming assistant of ImbutoSmart AI, helping smallholder farmers in Rwanda. Answer in simple English under 60 words. Give general agronomic guidance only; never invent rainfall, temperatures, prices, yields or guarantees. Because the answer is spoken aloud, use short plain sentences."
$chatBody = @{
  model = $chatModel
  messages = @(
    @{ role = "system"; content = $sys },
    @{ role = "user"; content = $question }
  )
  max_tokens = 160
  temperature = 0.3
} | ConvertTo-Json -Depth 6

$chat = Invoke-RestMethod "$chatUrl/chat/completions" -Method Post -ContentType "application/json" -Body $chatBody -TimeoutSec 600
$answer = $chat.choices[0].message.content
Write-Host "      answer: $answer" -ForegroundColor Yellow

$ttsBody = @{ model = $ttsModel; input = $answer; response_format = "wav" } | ConvertTo-Json
Invoke-WebRequest "$speechUrl/audio/speech" -Method Post -ContentType "application/json" -Body $ttsBody -OutFile $tmpAnswer -TimeoutSec 120
Write-Host "      spoke answer: $((Get-Item $tmpAnswer).Length) bytes of audio" -ForegroundColor Green

Write-Host "`nEND-TO-END OK: speech -> STT -> LLM -> TTS" -ForegroundColor Green

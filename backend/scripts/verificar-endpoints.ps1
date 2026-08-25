param(
    [string]$BaseUrl = "http://127.0.0.1:8000",
    [switch]$TestAntiAbuse
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Output ""
    Write-Output "=== $Message ==="
}

function Get-ErrorStatusCode {
    param($Exception)
    try {
        return [int]$Exception.Response.StatusCode
    }
    catch {
        try {
            return [int]$Exception.Response.StatusCode.Value__
        }
        catch {
            return 0
        }
    }
}

try {
    Write-Step "1) Health"
    $health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health"
    Write-Output ("HEALTH: " + ($health | ConvertTo-Json -Compress))

    Write-Step "2) Summary inicial"
    $summary0 = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/stats/summary"
    Write-Output ("SUMMARY0: " + ($summary0 | ConvertTo-Json -Compress -Depth 6))

    Write-Step "3) Visitante anonimo"
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $visitAnon = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/stats/visit" -WebSession $session -ContentType "application/json" -Body "{}"
    Write-Output ("VISIT_ANON: " + ($visitAnon | ConvertTo-Json -Compress -Depth 6))

    Write-Step "4) Criar usuario de teste e marcar presenca logada"
    $username = "teste_stats_" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
    $password = "123456"

    Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/register" -ContentType "application/json" -Body (@{ username = $username; password = $password } | ConvertTo-Json) | Out-Null
    $login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body (@{ username = $username; password = $password } | ConvertTo-Json)

    $headers = @{ Authorization = "Bearer $($login.access_token)" }
    $visitLogged = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/stats/visit" -Headers $headers -ContentType "application/json" -Body "{}"
    Write-Output ("VISIT_LOGGED: " + ($visitLogged | ConvertTo-Json -Compress -Depth 6))

    Write-Step "5) Summary final"
    $summary1 = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/stats/summary"
    Write-Output ("SUMMARY1: " + ($summary1 | ConvertTo-Json -Compress -Depth 6))

    Write-Step "6) Reacoes em lote"
    $stories = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/stories"
    $storyIds = @()
    if ($stories.Count -gt 0) {
        $storyIds = @($stories | Select-Object -First 3 | ForEach-Object { $_.id })
        $pairs = $storyIds | ForEach-Object { "story_ids=$_" }
        $query = [string]::Join("&", $pairs)
        $bulk = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/stories/reactions/bulk?$query" -WebSession $session
        Write-Output ("BULK: " + ($bulk | ConvertTo-Json -Compress -Depth 6))
    }
    else {
        Write-Output "BULK: sem historias aprovadas para testar"
    }

    if ($TestAntiAbuse.IsPresent) {
        Write-Step "7) Anti-abuso de reacoes"
        if ($storyIds.Count -eq 0) {
            Write-Output "ANTI_ABUSE: sem historias aprovadas para validar limite"
        }
        else {
            $targetStoryId = $storyIds[0]
            $blocked = $false
            $attempts = 0

            for ($i = 1; $i -le 15; $i++) {
                $attempts = $i
                try {
                    Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/stories/$targetStoryId/reactions" -WebSession $session -ContentType "application/json" -Body '{"emoji":"❤️"}' | Out-Null
                }
                catch {
                    $statusCode = Get-ErrorStatusCode -Exception $_.Exception
                    if ($statusCode -eq 429) {
                        $blocked = $true
                        Write-Output "ANTI_ABUSE: limite acionado na tentativa $i (HTTP 429)"
                        break
                    }
                    throw
                }
            }

            if (-not $blocked) {
                Write-Output "ANTI_ABUSE: limite nao acionado apos $attempts tentativas"
            }
        }
    }

    Write-Step "Resultado"
    Write-Output "Verificacao concluida com sucesso."
}
catch {
    Write-Step "Falha"
    Write-Output $_.Exception.Message
    exit 1
}

$body = @{
    content = '网传某地2024年发生7级地震，造成重大人员伤亡，请核实'
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/verify' -Method Post -ContentType 'application/json' -Body $body
$pipelineId = $resp.pipeline_id
Write-Host "Pipeline ID: $pipelineId"
Write-Host "Waiting 35s for pipeline to complete..."
Start-Sleep -Seconds 35

$result = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/pipeline/$pipelineId"
Write-Host "=========================================="
Write-Host "Status: $($result.status)"
Write-Host "Duration: $($result.duration_ms) ms"
Write-Host "=========================================="
Write-Host "Node Results:"
$result.node_results | ConvertTo-Json -Depth 5
Write-Host "=========================================="
Write-Host "Full Result (truncated):"
$result | ConvertTo-Json -Depth 3 | Select-Object -First 60

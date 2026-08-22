# package_submission.ps1
# Creates a clean submission zip archive adhering to Assignment Submission Usage Guidelines
# (excludes node_modules, target, dist, .env, .git, and IDE files)

$projectRoot = "a:\Projects\LMDTM\last-mile-delivery"
$zipFile = "a:\Projects\LMDTM\last-mile-delivery-tracker-submission.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

$excludePatterns = @(
    "*\node_modules\*",
    "*\node_modules",
    "*\target\*",
    "*\target",
    "*\dist\*",
    "*\dist",
    "*\.git\*",
    "*\.git",
    "*\.idea\*",
    "*\.idea",
    "*\.vscode\*",
    "*\.vscode",
    "*\.env",
    "*\.env.local",
    "*\*.log"
)

Write-Host "Creating clean submission zip archive: $zipFile..." -ForegroundColor Cyan

# Gather files matching inclusion
$filesToZip = Get-ChildItem -Path $projectRoot -Recurse | Where-Object {
    $itemPath = $_.FullName
    $exclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($itemPath -like $pattern) {
            $exclude = $true
            break
        }
    }
    -not $exclude -and -not $_.PSIsContainer
}

Write-Host "Found $($filesToZip.Count) clean source and configuration files to package." -ForegroundColor Green

# Create zip using .NET ZipFile
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tempFolder = Join-Path $env:TEMP "last-mile-delivery-clean-package"
if (Test-Path $tempFolder) { Remove-Item $tempFolder -Recurse -Force }
New-Item -ItemType Directory -Path $tempFolder | Out-Null

foreach ($file in $filesToZip) {
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1)
    $destinationPath = Join-Path $tempFolder $relativePath
    $destinationDir = Split-Path $destinationPath -Parent
    if (-not (Test-Path $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    }
    Copy-Item $file.FullName -Destination $destinationPath -Force
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($tempFolder, $zipFile)
Remove-Item $tempFolder -Recurse -Force

$zipInfo = Get-Item $zipFile
Write-Host "Success! Clean zip created at: $zipFile ($([Math]::Round($zipInfo.Length / 1MB, 2)) MB)" -ForegroundColor Green

# Run this to start the Android Emulator environment with Java Fix
$javaPath = "C:\Program Files\Android\Android Studio\jbr"
if (!(Test-Path $javaPath)) { $javaPath = "C:\Program Files\Android\Android Studio\jre" }
$env:JAVA_HOME = $javaPath
$env:Path = "$javaPath\bin;" + $env:Path

Write-Host "✅ Java Environment Fixed (OpenJDK 17)" -ForegroundColor Green

cd frontend
npx cap sync android
npx cap run android

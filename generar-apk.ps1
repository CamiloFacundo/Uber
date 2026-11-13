# Genera la app Android de AUREN (APK de prueba).
#   Uso:  .\generar-apk.ps1            -> con el simulador (funciona sin servidor ni internet)
#         .\generar-apk.ps1 -Servidor  -> conectada al backend del profesor (environment.prod.ts)
# El APK queda en: android\app\build\outputs\apk\debug\app-debug.apk
param([switch]$Servidor)
# (Los avisos que Angular escribe en la salida de error no detienen el proceso; se revisa el código de salida)

# Gradle necesita Java 21 (el Java 25/26 del sistema es demasiado nuevo para Gradle 8)
$env:JAVA_HOME = 'C:\Program Files\Android\openjdk\jdk-21.0.8'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
# Sin preguntas interactivas de Angular (ej. analíticas), para que no se quede esperando
$env:NG_CLI_ANALYTICS = 'false'
$env:CI = 'true'

$config = if ($Servidor) { 'production' } else { 'sinred' }
Write-Host "1/3 Compilando la app web ($config)..."
npx ng build --configuration=$config
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '2/3 Copiando la app web al proyecto Android...'
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '3/3 Compilando el APK...'
Push-Location android
.\gradlew.bat assembleDebug
$codigo = $LASTEXITCODE
Pop-Location
if ($codigo -ne 0) { exit 1 }

Write-Host ''
Write-Host 'Listo: android\app\build\outputs\apk\debug\app-debug.apk'

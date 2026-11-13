# Abre el celular virtual de Android "AUREN_Pixel" e instala la app AUREN.
#   Uso:  .\abrir-emulador.ps1             -> abre el emulador, instala el APK actual y abre la app
#         .\abrir-emulador.ps1 -SoloAbrir  -> solo abre el emulador (sin reinstalar)
# El APK se genera antes con .\generar-apk.ps1 (o .\generar-apk.ps1 -Servidor).
# El emulador usa la red del computador: si el computador llega al servidor del profesor, la app también.
param([switch]$SoloAbrir)

$env:JAVA_HOME = 'C:\Program Files\Android\openjdk\jdk-21.0.8'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$sdk\platform-tools\adb.exe"
$emulador = "$sdk\emulator\emulator.exe"
$avd = 'AUREN_Pixel'
$imagen = 'system-images;android-34;google_apis;x86_64'
$apk = Join-Path $PSScriptRoot 'android\app\build\outputs\apk\debug\app-debug.apk'

# Crea el celular virtual la primera vez (Pixel 7, Android 14)
if (-not ((& $emulador -list-avds) -contains $avd)) {
  Write-Host "Creando el celular virtual $avd..."
  # Comillas explícitas: avdmanager es un .bat y cmd parte el nombre del paquete en los ';'
  'no' | & "$sdk\cmdline-tools\latest\bin\avdmanager.bat" create avd -n $avd -k "`"$imagen`"" -d pixel_7
  if ($LASTEXITCODE -ne 0) { Write-Host "Falta la imagen $imagen (instálela con sdkmanager o Android Studio)."; exit 1 }
}

# Arranca el emulador si no hay uno abierto
if (-not ((& $adb devices) -match '^emulator-\d+\s+device')) {
  Write-Host 'Abriendo el emulador...'
  Start-Process $emulador -ArgumentList '-avd', $avd, '-gpu', 'auto', '-no-snapshot-save'
}

Write-Host 'Esperando a que Android termine de arrancar...'
& $adb wait-for-device
do { Start-Sleep -Seconds 2 } until ((& $adb shell getprop sys.boot_completed 2>$null) -match '1')

# GPS simulado en Neiva (Parque Santander); el orden es longitud, latitud
& $adb emu geo fix -75.2894 2.9273 | Out-Null

if ($SoloAbrir) { exit 0 }

if (-not (Test-Path $apk)) { Write-Host 'No hay APK: ejecute primero .\generar-apk.ps1'; exit 1 }
Write-Host 'Instalando AUREN...'
& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { exit 1 }
& $adb shell am start -W -n co.auren.app/.MainActivity | Out-Null
Write-Host 'Listo: AUREN está abierta en el emulador.'

# AUREN — Frontend de la app de transporte (Ionic + Angular)

Frontend de una app tipo Uber con tres módulos: **administrador**, **conductor** y **cliente**.
Consume la API REST del backend Laravel del profesor (arquitectura cliente-servidor, autenticación JWT).

## Cómo correrlo

```bash
npm install      # solo la primera vez
ionic serve      # abre http://localhost:8100
```

## Servidor real vs. backend simulado

En `src/environments/environment.ts`:

- `apiUrl: 'http://20.20.1.42:8000/api'` → dirección del backend.
- `useMock: false` → peticiones HTTP reales al servidor (hay que estar en la red donde está el servidor).
- `useMock: true` → un backend simulado dentro del navegador (`core/mock/mock-backend.interceptor.ts`)
  responde igual que la API. Sirve para probar o presentar sin conexión.
  Usuarios: `admin@uber.com` / `admin123`, `conductor@uber.com` / `conductor123`,
  `cliente@uber.com` / `cliente123`, `andres@uber.com` / `andres123` (conductor pendiente de aprobación).

## App Android (Capacitor)

La misma app se empaqueta como aplicación Android con Capacitor (carpeta `android/`, id `co.auren.app`).

```powershell
.\generar-apk.ps1            # con el simulador: funciona sin servidor
.\generar-apk.ps1 -Servidor  # conectada al backend del profesor
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`; se copia al celular y se instala
(Android pide permitir "instalar apps de origen desconocido"). Para probarla en el emulador o depurarla:
`npx cap open android` abre el proyecto en Android Studio.

- Permisos: internet, ubicación (GPS) y vibración (`android/app/src/main/AndroidManifest.xml`).
- El servidor del profesor usa `http`, por eso se permite tráfico sin cifrar (`usesCleartextTraffic`, `allowMixedContent`).
- Gradle necesita Java 21 (el script usa el JDK de `C:\Program Files\Android\openjdk\jdk-21.0.8`).
- Ícono y pantalla de inicio: `assets/` → `npx @capacitor/assets generate --android`.
- iPhone: Capacitor también genera la app iOS, pero compilarla exige un Mac con Xcode.

## Estructura

```
src/app/
├── core/                              Lógica compartida (no tiene pantallas)
│   ├── models/models.ts               Interfaces con los mismos campos que la API
│   ├── services/api.service.ts        Única puerta al backend (GET/POST/PUT/PATCH/DELETE)
│   ├── services/auth.service.ts       /auth: login, registro, me, logout, forgot-password
│   ├── services/cliente.service.ts    /client: estimar, pedir, viaje activo, cancelar, historial, calificar
│   ├── services/conductor.service.ts  /driver: disponibilidad, solicitudes, aceptar, llegué, iniciar, finalizar, GPS
│   ├── services/admin.service.ts      /admin: dashboard, conductores, aprobación, viajes, tarifas
│   ├── guards/role.guard.ts           Cada rol (admin, client, driver) solo entra a su módulo
│   ├── interceptors/token.interceptor.ts  Agrega "Authorization: Bearer <token>" y "Accept: application/json"
│   └── mock/mock-backend.interceptor.ts   Backend simulado (solo con useMock = true)
├── auth/        Login (correo o teléfono), registro (cliente o conductor con vehículo), recuperar contraseña
├── admin/       Panel (KPIs), Conductores (aprobar/suspender/rechazar), Viajes (filtro por estado), Tarifas
├── conductor/   Disponible, solicitudes, aceptar → llegué → iniciar → finalizar, envío de GPS
├── cliente/     Origen/destino, tarifa estimada, seguimiento del viaje, cancelar, calificar, historial
└── shared/      Perfil, tarjeta de viaje, estados en español, lugares de Neiva con coordenadas
```

## Endpoints que usa el frontend

| Método | Ruta | Pantalla |
|---|---|---|
| POST | `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/forgot-password` | Login, registro, perfil, recuperar |
| GET | `/auth/me` | Perfil |
| POST | `/client/estimate-fare`, `/client/ride-requests` | Cliente: pedir viaje |
| GET | `/client/active` (cada 5 s) | Cliente: seguimiento |
| POST | `/client/cancel/{id}`, `/client/trips/{id}/rating` | Cliente: cancelar y calificar |
| GET | `/client/trips` | Cliente: historial |
| PUT | `/driver/availability` | Conductor: disponible |
| GET | `/driver/ride-requests` (cada 5 s) | Conductor: solicitudes |
| POST | `/driver/ride-requests/{id}/accept` | Conductor: aceptar (409 si otro lo tomó) |
| POST | `/driver/trips/{id}/arrive` · `start` · `complete` | Conductor: llegué, iniciar, finalizar |
| POST | `/driver/location` (cada 10 s con viaje) | Conductor: GPS |
| GET | `/admin/dashboard`, `/admin/drivers`, `/admin/trips`, `/admin/fares` | Admin |
| PATCH | `/admin/drivers/{id}/approval` | Admin: aprobar conductor |
| POST | `/admin/fares` | Admin: nueva tarifa |

## Pendiente de confirmar con el profesor

La documentación no trae estos datos, así que el frontend hace una suposición:

- No hay endpoint para que el conductor consulte su viaje actual: el viaje aceptado se guarda en el dispositivo.
- No hay endpoint para leer la disponibilidad actual del conductor: se recuerda en el dispositivo.
- No hay historial ni resumen de ingresos del conductor documentado.
- `/client/cancel/{id}`: se envía el id de la solicitud o del viaje activo, según lo que devuelva `/client/active`.
- La forma de la respuesta de `/admin/trips` y `/admin/fares` no está documentada; se aceptan arreglos o listas paginadas (`{ data: [...] }`).
- `/admin/reports` y `/admin/audit-logs` no tienen pantalla porque no se documentó su respuesta.

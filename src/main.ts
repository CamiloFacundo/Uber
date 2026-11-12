import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { tokenInterceptor } from './app/core/interceptors/token.interceptor';
import { mockBackendInterceptor } from './app/core/mock/mock-backend.interceptor';

// Formato colombiano para precios, números y fechas ($ 8.550 · 2,6 km)
registerLocaleData(localeEsCo);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // Cliente HTTP para consumir la API REST: primero se agrega el token y, si useMock = true,
    // el backend simulado responde en lugar del servidor real.
    provideHttpClient(withInterceptors([tokenInterceptor, mockBackendInterceptor])),
  ],
});

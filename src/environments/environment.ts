// Configuración en desarrollo.
// `ng build` reemplaza este archivo por environment.prod.ts (ver angular.json).

export const environment = {
  production: false,

  // URL base del backend Laravel del profesor (API REST).
  apiUrl: 'http://20.20.1.42:8000/api',

  // false = la app le hace peticiones HTTP reales al backend.
  // true  = un backend simulado dentro del navegador responde igual que la API (sirve sin red).
  useMock: true,
};



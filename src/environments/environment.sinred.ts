// Configuración SIN RED: la usa `ionic serve --configuration=sinred`.
// El backend simulado responde igual que la API, así que la app funciona sin el servidor.

export const environment = {
  production: false,
  apiUrl: 'http://20.20.1.42:8000/api',
  useMock: true,
};

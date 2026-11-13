import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { AuthResponse, Rol, Usuario } from '../models/models';
import { ApiService } from './api.service';

/** Datos del formulario de registro. Los de vehículo solo se envían si role = 'driver'. */
export interface DatosRegistro {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'client' | 'driver';
  license_number?: string;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  capacity?: number;
  color?: string;
  /** car | moto (campo extra de AUREN) */
  vehicle_type?: 'car' | 'moto';
}

/**
 * Dónde se guarda la sesión:
 * - sessionStorage: es de cada pestaña, así se pueden tener abiertos el pasajero y el conductor
 *   al mismo tiempo en dos pestañas del mismo navegador sin que una sesión reemplace a la otra.
 * - localStorage: copia de la última sesión, para que al abrir la app de nuevo no haya que volver a entrar.
 */
const almacen = {
  leer(clave: string): string | null {
    try {
      const deLaPestana = sessionStorage.getItem(clave);
      if (deLaPestana !== null) return deLaPestana;
      // Pestaña nueva: toma la última sesión y la deja fija para esta pestaña
      const ultima = localStorage.getItem(clave);
      if (ultima !== null) sessionStorage.setItem(clave, ultima);
      return ultima;
    } catch {
      return null;
    }
  },
  escribir(clave: string, valor: string): void {
    try {
      sessionStorage.setItem(clave, valor);
      localStorage.setItem(clave, valor);
    } catch { /* sin almacenamiento */ }
  },
  borrar(clave: string): void {
    try {
      sessionStorage.removeItem(clave);
      localStorage.removeItem(clave);
    } catch { /* sin almacenamiento */ }
  },
};

/**
 * Maneja la sesión con JWT: login, registro, logout y el usuario actual.
 * Guarda el token y el usuario (ver `almacen`) para no perder la sesión al recargar.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private _usuario = signal<Usuario | null>(this.leerSesion());
  usuario = this._usuario.asReadonly();
  estaLogueado = computed(() => this._usuario() !== null);

  get token(): string | null {
    return almacen.leer('token');
  }

  // POST /auth/login  { login, password }  (login = correo o teléfono)
  login(login: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', { login, password }).pipe(tap((r) => this.guardarSesion(r)));
  }

  // POST /auth/register
  registrar(datos: DatosRegistro): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/register', datos).pipe(tap((r) => this.guardarSesion(r)));
  }

  // POST /auth/forgot-password  { email, new_password }
  restablecerClave(email: string, new_password: string): Observable<string> {
    return this.api
      .post<{ message: string }>('auth/forgot-password', { email, new_password })
      .pipe(map((r) => r.message));
  }

  // GET /auth/me  (refresca los datos del usuario desde el servidor)
  refrescarPerfil(): Observable<Usuario> {
    return this.api.get<{ user: Usuario }>('auth/me').pipe(
      map((r) => r.user),
      tap((u) => this.actualizarUsuario(u)),
    );
  }

  // POST /auth/logout  (invalida el token en el servidor) y limpia la sesión local
  logout(): void {
    if (this.token) {
      this.api.post('auth/logout', {}).subscribe({ error: () => undefined });
    }
    this.limpiarSesion();
  }

  /** Cierra la sesión solo en el navegador (cuando el token ya no sirve: 401). */
  limpiarSesion(): void {
    almacen.borrar('token');
    almacen.borrar('usuario');
    this._usuario.set(null);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  actualizarUsuario(usuario: Usuario): void {
    almacen.escribir('usuario', JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

  /** Ruta de inicio según el rol del backend: admin → /admin, client → /cliente, driver → /conductor */
  rutaInicio(rol: Rol): string {
    return { admin: '/admin', client: '/cliente', driver: '/conductor' }[rol];
  }

  private guardarSesion(resp: AuthResponse): void {
    almacen.escribir('token', resp.access_token);
    this.actualizarUsuario(resp.user);
  }

  private leerSesion(): Usuario | null {
    try {
      const u = almacen.leer('usuario');
      return u ? (JSON.parse(u) as Usuario) : null;
    } catch {
      return null;
    }
  }
}

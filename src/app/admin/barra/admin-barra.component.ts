import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonMenuButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, idCardOutline, logOutOutline, notificationsOutline, searchOutline, settingsOutline, warningOutline, carSportOutline } from 'ionicons/icons';
import { AdminDatosService } from '../../core/services/admin-datos.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';

/**
 * Barra superior del administrador: menú (en celular), búsqueda global de conductores y viajes,
 * notificaciones (conductores por aprobar e incidencias) y el perfil del administrador.
 */
@Component({
  selector: 'app-admin-barra',
  imports: [IonMenuButton, IonIcon],
  template: `
    <div class="barra">
      <ion-menu-button menu="admin" class="menu" aria-label="Abrir menú"></ion-menu-button>

      <div class="buscar" (focusout)="alSalir($event, abierto)">
        <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
        <input
          type="search"
          placeholder="Buscar conductores, placas o viajes..."
          [value]="texto()"
          (input)="texto.set($any($event.target).value)"
          (focus)="abierto.set(true)"
          aria-label="Buscar en el panel"
        />
        @if (abierto() && texto().trim().length > 1) {
          <div class="resultados" role="listbox">
            @for (r of resultados(); track r.clave) {
              <button type="button" class="resultado" (click)="ir(r.ruta, r.q)">
                <ion-icon [name]="r.icono" aria-hidden="true"></ion-icon>
                <span><strong>{{ r.titulo }}</strong><small>{{ r.detalle }}</small></span>
              </button>
            } @empty {
              <p class="vacio">Sin resultados para "{{ texto() }}"</p>
            }
          </div>
        }
      </div>

      <div class="derecha">
        <div class="menu-flotante" (focusout)="alSalir($event, avisosAbierto)">
          <button type="button" class="icono" (click)="avisosAbierto.set(!avisosAbierto())" aria-label="Notificaciones">
            <ion-icon name="notifications-outline"></ion-icon>
            @if (totalAvisos()) {
              <span class="contador">{{ totalAvisos() }}</span>
            }
          </button>
          @if (avisosAbierto()) {
            <div class="panel">
              @if (datos.pendientes().length) {
                <button type="button" class="aviso" (click)="ir('/admin/conductores')">
                  <ion-icon name="id-card-outline" aria-hidden="true"></ion-icon>
                  {{ datos.pendientes().length }} {{ datos.pendientes().length === 1 ? 'conductor espera' : 'conductores esperan' }} aprobación
                </button>
              }
              @if (datos.incidencias().length) {
                <button type="button" class="aviso" (click)="ir('/admin/soporte')">
                  <ion-icon name="warning-outline" aria-hidden="true"></ion-icon>
                  {{ datos.incidencias().length }} {{ datos.incidencias().length === 1 ? 'incidencia reportada' : 'incidencias reportadas' }}
                </button>
              }
              @if (!totalAvisos()) {
                <p class="vacio">No tienes notificaciones nuevas</p>
              }
            </div>
          }
        </div>

        <div class="menu-flotante" (focusout)="alSalir($event, perfilAbierto)">
          <button type="button" class="perfil" (click)="perfilAbierto.set(!perfilAbierto())">
            <span class="avatar" aria-hidden="true">{{ inicial() }}</span>
            <span class="nombre"><strong>{{ nombre() }}</strong><small>Administrador</small></span>
            <ion-icon name="chevron-down" aria-hidden="true"></ion-icon>
          </button>
          @if (perfilAbierto()) {
            <div class="panel">
              <button type="button" class="aviso" (click)="ir('/admin/configuracion')">
                <ion-icon name="settings-outline" aria-hidden="true"></ion-icon> Configuración
              </button>
              <button type="button" class="aviso salir" (click)="salir()">
                <ion-icon name="log-out-outline" aria-hidden="true"></ion-icon> Cerrar sesión
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .barra { display: flex; align-items: center; gap: 14px; padding: calc(env(safe-area-inset-top) + 12px) 24px 12px; border-bottom: 1px solid var(--rd-linea); background: var(--rd-fondo); }
    .menu { --color: var(--rd-tinta); flex: none; }
    .buscar { position: relative; flex: 1; min-width: 0; max-width: 520px; display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 16px; border: 1px solid var(--rd-linea); border-radius: 14px; background: var(--rd-superficie); }
    .buscar > ion-icon { flex: none; font-size: 20px; color: var(--rd-suave); }
    .buscar input { flex: 1; min-width: 0; width: 100%; border: 0; outline: none; font-family: var(--rd-letra); font-size: 15px; color: var(--rd-tinta); background: transparent; }
    .buscar:focus-within { border-color: var(--rd-primario); }
    .resultados, .panel {
      position: absolute; z-index: 50; top: calc(100% + 8px); display: flex; flex-direction: column;
      padding: 6px; border: 1px solid var(--rd-linea); border-radius: 14px; background: var(--rd-superficie);
      box-shadow: 0 12px 30px rgba(16, 24, 39, 0.3);
    }
    .resultados { left: 0; right: 0; max-height: 360px; overflow-y: auto; }
    .panel { right: 0; min-width: 260px; }
    .resultado, .aviso {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-radius: 10px;
      text-align: left; font-family: var(--rd-letra); font-size: 14px; color: var(--rd-tinta); background: transparent; cursor: pointer;
    }
    .resultado:hover, .aviso:hover { background: var(--rd-primario-suave); }
    .resultado ion-icon, .aviso ion-icon { flex: none; font-size: 20px; color: var(--rd-primario); }
    .resultado span { display: flex; flex-direction: column; min-width: 0; }
    .resultado small { font-size: 12px; color: var(--rd-suave); }
    .salir, .salir ion-icon { color: var(--rd-alerta); }
    .vacio { margin: 0; padding: 12px; font-size: 14px; color: var(--rd-suave); }
    .derecha { display: flex; align-items: center; gap: 12px; margin-left: auto; }
    .menu-flotante { position: relative; }
    .icono { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; font-size: 22px; color: var(--rd-tinta); background: var(--rd-superficie); cursor: pointer; }
    .contador { position: absolute; top: 4px; right: 4px; display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; font-size: 11px; font-weight: 700; color: #ffffff; background: var(--rd-alerta); }
    .perfil { display: flex; align-items: center; gap: 10px; padding: 4px 8px 4px 4px; border: 0; border-radius: 14px; color: var(--rd-tinta); background: transparent; cursor: pointer; }
    .avatar { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; font-family: var(--rd-titulos); font-weight: 700; color: #101827; background: #c8a96a; }
    .nombre { display: flex; flex-direction: column; text-align: left; }
    .nombre strong { font-family: var(--rd-titulos); font-size: 14px; }
    .nombre small { font-size: 12px; color: var(--rd-suave); }
    button:focus-visible { outline: 2px solid var(--rd-primario); outline-offset: 2px; }
    @media (max-width: 720px) {
      .barra { padding-left: 8px; padding-right: 12px; gap: 8px; }
      .nombre, .perfil > ion-icon { display: none; }
      .buscar input::placeholder { font-size: 13px; }
    }
  `,
})
export class AdminBarraComponent {
  datos = inject(AdminDatosService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ui = inject(UiService);

  texto = signal('');
  abierto = signal(false);
  avisosAbierto = signal(false);
  perfilAbierto = signal(false);

  nombre = computed(() => this.auth.usuario()?.name ?? 'Administrador');
  inicial = computed(() => this.nombre().charAt(0).toUpperCase());
  totalAvisos = computed(() => this.datos.pendientes().length + this.datos.incidencias().length);

  /** Busca en conductores (nombre, correo, placa) y viajes (número, pasajero, conductor, destino) */
  resultados = computed(() => {
    const t = this.texto().trim().toLowerCase();
    if (t.length < 2) return [];
    const conductores = this.datos.conductores()
      .filter((c) => [c.user.name, c.user.email, ...c.vehicles.map((v) => v.plate)].some((x) => x?.toLowerCase().includes(t)))
      .slice(0, 5)
      .map((c) => ({
        clave: 'c' + c.id, icono: 'id-card-outline', titulo: c.user.name,
        detalle: `Conductor, ${c.vehicles[0]?.plate ?? 'sin vehículo'}`, ruta: '/admin/conductores', q: c.user.name,
      }));
    const viajes = this.datos.viajes()
      .filter((v) => [String(v.id), v.client?.name, v.driver?.user?.name, v.destination_name, v.origin_name].some((x) => x?.toLowerCase().includes(t)))
      .slice(0, 5)
      .map((v) => ({
        clave: 'v' + v.id, icono: 'car-sport-outline', titulo: `Viaje #${v.id}`,
        detalle: `${v.client?.name ?? ''} → ${v.destination_name ?? ''}`, ruta: '/admin/viajes', q: String(v.id),
      }));
    return [...conductores, ...viajes];
  });

  constructor() {
    addIcons({ carSportOutline, chevronDown, idCardOutline, logOutOutline, notificationsOutline, searchOutline, settingsOutline, warningOutline });
  }

  ir(ruta: string, q?: string): void {
    this.abierto.set(false);
    this.avisosAbierto.set(false);
    this.perfilAbierto.set(false);
    this.texto.set('');
    this.router.navigate([ruta], { queryParams: q ? { q } : {} });
  }

  async salir(): Promise<void> {
    this.perfilAbierto.set(false);
    if (await this.ui.confirmar('Cerrar sesión', '¿Seguro que quieres salir?')) this.auth.logout();
  }

  // Cierra el menú solo si el foco sale del contenedor; el retraso deja pasar el clic en Safari (no enfoca botones)
  alSalir(e: FocusEvent, abierto: WritableSignal<boolean>): void {
    const contenedor = e.currentTarget as HTMLElement;
    if (contenedor.contains(e.relatedTarget as Node | null)) return;
    setTimeout(() => abierto.set(false), 150);
  }
}

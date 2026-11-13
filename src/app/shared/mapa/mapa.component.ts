import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewEncapsulation, effect, inject, input, output, viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { TemaService } from '../../core/services/tema.service';

export interface Punto {
  lat: number;
  lng: number;
}

const NEIVA: Punto = { lat: 2.9273, lng: -75.2819 };

const ICONO_CARRO =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM7.5 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7 10h10l-1-3H8z"/></svg>';

/** Carro visto desde arriba, apuntando al norte (se gira según el rumbo) */
const CARRO_ARRIBA =
  '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">' +
  '<ellipse cx="20" cy="21" rx="11" ry="17" fill="rgba(16,24,39,0.28)"/>' +
  '<rect x="11" y="3" width="18" height="34" rx="7" fill="#c8a96a" stroke="#ffffff" stroke-width="2"/>' +
  '<path d="M13.5 12.5Q20 8.5 26.5 12.5L25 17H15Z" fill="#101827"/>' +
  '<rect x="14.5" y="18.5" width="11" height="8.5" rx="2" fill="#dcc48f"/>' +
  '<path d="M15 29H25L26 33Q20 35 14 33Z" fill="#101827"/>' +
  '<rect x="13" y="4.5" width="3" height="2" rx="1" fill="#fff6d8"/><rect x="24" y="4.5" width="3" height="2" rx="1" fill="#fff6d8"/>' +
  '</svg>';

/** Moto vista desde arriba, con el conductor */
const MOTO_ARRIBA =
  '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">' +
  '<ellipse cx="20" cy="21" rx="7" ry="16" fill="rgba(16,24,39,0.28)"/>' +
  '<rect x="17" y="3" width="6" height="34" rx="3" fill="#101827" stroke="#ffffff" stroke-width="1.5"/>' +
  '<rect x="11" y="10" width="18" height="3" rx="1.5" fill="#101827" stroke="#ffffff" stroke-width="1"/>' +
  '<circle cx="20" cy="19" r="6" fill="#c8a96a" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="20" cy="19" r="2.5" fill="#101827"/>' +
  '</svg>';

/** Tiempo que tarda el vehículo en llegar a su nueva posición (cerca del intervalo de consulta de 5 s) */
const DURACION_MOVIMIENTO = 4500;

/**
 * Mapa de AUREN (Leaflet + mapa base gris de Esri).
 * Muestra origen, destino, la posición del conductor y la tuya, y dibuja la ruta por las calles
 * (servicio público OSRM; si no responde, une los puntos con una línea recta).
 *
 *   <app-mapa [origen]="..." [destino]="..." [conductor]="..." (toque)="..." />
 *
 * Necesita internet para descargar los mapas; sin conexión se ve el fondo vacío pero los puntos siguen.
 */
@Component({
  selector: 'app-mapa',
  template: `<div #contenedor class="rd-mapa"></div>`,
  // Leaflet crea sus propios elementos (marcadores), por eso los estilos son globales con prefijo rd-mapa
  encapsulation: ViewEncapsulation.None,
  styles: `
    app-mapa {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
    }
    .rd-mapa {
      width: 100%;
      height: 100%;
      background: var(--rd-fondo);
      font-family: var(--rd-letra);
    }
    .rd-mapa .leaflet-control-attribution {
      font-size: 10px;
    }
    .rd-mapa-pin {
      display: grid;
      place-items: center;
    }
    .rd-mapa-pin span {
      display: block;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(16, 24, 39, 0.35);
    }
    .rd-mapa-pin.origen span {
      width: 18px;
      height: 18px;
      border: 5px solid #087f8c;
      background: #ffffff;
    }
    .rd-mapa-pin.destino span {
      width: 20px;
      height: 20px;
      border: 5px solid #ffffff;
      background: #c8a96a;
    }
    .rd-mapa-pin.yo span {
      width: 16px;
      height: 16px;
      border: 3px solid #ffffff;
      background: #2f6fed;
      box-shadow: 0 0 0 6px rgba(47, 111, 237, 0.25);
    }
    .rd-mapa-vehiculo {
      background: transparent;
      border: 0;
    }
    .rd-mapa-vehiculo .rd-giro {
      width: 40px;
      height: 40px;
      transition: transform 0.6s ease;
      filter: drop-shadow(0 2px 3px rgba(16, 24, 39, 0.35));
    }
    @media (prefers-reduced-motion: reduce) {
      .rd-mapa-vehiculo .rd-giro {
        transition: none;
      }
    }
    .rd-mapa-pin.carro span {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 2px solid #ffffff;
      background: #c8a96a;
      color: #101827;
      font-size: 15px;
    }
  `,
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  origen = input<Punto | null>(null);
  destino = input<Punto | null>(null);
  conductor = input<Punto | null>(null);
  yo = input<Punto | null>(null);
  /** Puntos extra (ej. solicitudes cercanas para el conductor) */
  extras = input<Punto[]>([]);
  /** Varios carros a la vez (ej. el mapa en tiempo real del administrador) */
  carros = input<Punto[]>([]);
  /** Cómo se dibuja el conductor: carro o moto vistos desde arriba */
  tipoVehiculo = input<'car' | 'moto'>('car');
  /** Varios destinos a la vez */
  destinos = input<Punto[]>([]);

  /** Se emite cuando el usuario toca el mapa */
  toque = output<Punto>();

  private contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private mapa?: L.Map;
  private capa = L.layerGroup();
  private ruta?: L.Polyline;
  private claveRuta = '';
  private observador?: ResizeObserver;
  private tema = inject(TemaService);
  private capaBase?: L.TileLayer;
  /** Vehículo del conductor: un marcador propio que se desliza en vez de redibujarse */
  private vehiculo?: L.Marker;
  private rumbo = 0;
  private animacion?: number;
  private claveEncuadre = '';

  constructor() {
    // Mapa claro u oscuro según el tema de la app
    effect(() => {
      const oscuro = this.tema.oscuro();
      if (this.mapa) this.ponerCapaBase(oscuro);
    });

    // El vehículo del conductor se desliza hasta su nueva posición, girado hacia donde va
    effect(() => {
      const p = this.conductor();
      const tipo = this.tipoVehiculo();
      if (this.mapa) this.moverVehiculo(p, tipo);
    });

    // Cada vez que cambian los puntos, se redibuja el mapa
    effect(() => {
      const datos = {
        origen: this.origen(),
        destino: this.destino(),
        conductor: this.conductor(),
        yo: this.yo(),
        extras: this.extras(),
        carros: this.carros(),
        destinos: this.destinos(),
      };
      if (this.mapa) this.dibujar(datos);
    });
  }

  ngAfterViewInit(): void {
    this.mapa = L.map(this.contenedor().nativeElement, {
      center: [NEIVA.lat, NEIVA.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });
    // El enlace por defecto de Leaflet abre en la misma ventana y saca al usuario de la app
    this.mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    this.ponerCapaBase(this.tema.oscuro());
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);
    this.capa.addTo(this.mapa);
    this.mapa.on('click', (e: L.LeafletMouseEvent) => this.toque.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));

    // Ionic muestra las páginas con animación: cuando el tamaño cambia, Leaflet debe recalcular
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor().nativeElement);
    [100, 400, 900].forEach((ms) => setTimeout(() => this.mapa?.invalidateSize(), ms));

    this.dibujar({
      origen: this.origen(), destino: this.destino(), conductor: this.conductor(), yo: this.yo(), extras: this.extras(),
      carros: this.carros(), destinos: this.destinos(),
    });
    this.moverVehiculo(this.conductor(), this.tipoVehiculo());
  }

  /** Teal de la marca; en modo oscuro uno más brillante para que resalte. */
  private colorRuta(): string {
    return this.tema.oscuro() ? '#17a9b8' : '#087f8c';
  }

  /** Mapa base gris de Esri (gratuito, sin clave), claro u oscuro. */
  private ponerCapaBase(oscuro: boolean): void {
    if (!this.mapa) return;
    this.capaBase?.remove();
    const capa = oscuro ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
    this.capaBase = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${capa}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: 'Mapa &copy; Esri, HERE, Garmin, &copy; OpenStreetMap',
    }).addTo(this.mapa);
    this.capaBase.bringToBack();
  }

  ngOnDestroy(): void {
    if (this.animacion) cancelAnimationFrame(this.animacion);
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  private dibujar(d: {
    origen: Punto | null; destino: Punto | null; conductor: Punto | null; yo: Punto | null; extras: Punto[];
    carros: Punto[]; destinos: Punto[];
  }): void {
    if (!this.mapa) return;
    this.capa.clearLayers();
    const puntos: L.LatLngExpression[] = [];

    const marcar = (p: Punto | null, clase: string, contenido = '', tam = 24) => {
      if (!p) return;
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: `rd-mapa-pin ${clase}`, html: `<span>${contenido}</span>`, iconSize: [tam, tam] }),
        keyboard: false,
      }).addTo(this.capa);
      puntos.push([p.lat, p.lng]);
    };

    d.extras.forEach((p) => marcar(p, 'origen'));
    d.destinos.forEach((p) => marcar(p, 'destino', '', 26));
    d.carros.forEach((p) => marcar(p, 'carro', ICONO_CARRO, 32));
    marcar(d.yo, 'yo', '', 22);
    marcar(d.origen, 'origen');
    marcar(d.destino, 'destino', '', 26);
    // el conductor se dibuja aparte (moverVehiculo), pero cuenta para encuadrar el mapa
    if (d.conductor) puntos.push([d.conductor.lat, d.conductor.lng]);

    this.dibujarRuta(d.origen, d.destino);

    // Se encuadra solo cuando cambian los puntos fijos, no cada vez que el vehículo avanza
    const clave = JSON.stringify([d.origen, d.destino, d.yo, d.extras, d.carros, d.destinos, !!d.conductor]);
    if (clave === this.claveEncuadre) return;
    this.claveEncuadre = clave;

    if (puntos.length === 1) {
      this.mapa.setView(puntos[0], 15, { animate: true });
    } else if (puntos.length > 1) {
      this.mapa.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 16, animate: true });
    }
  }

  /** Ruta por las calles con OSRM; si falla, línea recta punteada. */
  private dibujarRuta(origen: Punto | null, destino: Punto | null): void {
    const clave = origen && destino ? `${origen.lat},${origen.lng};${destino.lat},${destino.lng}` : '';
    if (!origen || !destino) {
      this.claveRuta = '';
      this.ruta?.remove();
      this.ruta = undefined;
      return;
    }
    if (clave === this.claveRuta && this.ruta) {
      this.ruta.addTo(this.capa);
      return;
    }
    this.claveRuta = clave;
    const recta = L.polyline([[origen.lat, origen.lng], [destino.lat, destino.lng]], {
      color: this.colorRuta(), weight: 4, opacity: 0.6, dashArray: '6 8',
    });
    this.ruta = recta.addTo(this.capa);

    const url = `https://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
    const control = new AbortController();
    setTimeout(() => control.abort(), 6000);
    fetch(url, { signal: control.signal })
      .then((r) => r.json())
      .then((j: { routes?: { geometry: { coordinates: [number, number][] } }[] }) => {
        const coords = j.routes?.[0]?.geometry.coordinates;
        if (!coords || clave !== this.claveRuta) return;
        this.ruta?.remove();
        this.ruta = L.polyline(coords.map(([lng, lat]) => [lat, lng] as L.LatLngTuple), {
          color: this.colorRuta(), weight: 5, opacity: 0.9,
        }).addTo(this.capa);
      })
      .catch(() => undefined); // sin internet: se queda la línea recta
  }

  /** Crea, gira y desliza el marcador del vehículo hasta su nueva posición. */
  private moverVehiculo(p: Punto | null, tipo: 'car' | 'moto'): void {
    if (!this.mapa) return;
    if (!p) {
      this.vehiculo?.remove();
      this.vehiculo = undefined;
      return;
    }
    const icono = () =>
      L.divIcon({
        className: 'rd-mapa-vehiculo',
        html: `<div class="rd-giro" data-tipo="${tipo}" style="transform: rotate(${this.rumbo}deg)">${tipo === 'moto' ? MOTO_ARRIBA : CARRO_ARRIBA}</div>`,
        iconSize: [40, 40],
      });
    if (!this.vehiculo) {
      this.vehiculo = L.marker([p.lat, p.lng], { icon: icono(), keyboard: false, zIndexOffset: 1000 }).addTo(this.mapa);
      return;
    }
    if (this.vehiculo.getElement()?.querySelector('.rd-giro')?.getAttribute('data-tipo') !== tipo) {
      this.vehiculo.setIcon(icono());
    }

    const desde = this.vehiculo.getLatLng();
    const hasta = L.latLng(p.lat, p.lng);
    if (desde.distanceTo(hasta) < 3) return; // quieto (o ruido del GPS)

    this.rumbo = rumbo(desde, hasta);
    const giro = this.vehiculo.getElement()?.querySelector<HTMLElement>('.rd-giro');
    if (giro) giro.style.transform = `rotate(${this.rumbo}deg)`;

    if (this.animacion) cancelAnimationFrame(this.animacion);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.vehiculo.setLatLng(hasta);
    } else {
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / DURACION_MOVIMIENTO);
        this.vehiculo?.setLatLng([desde.lat + (hasta.lat - desde.lat) * t, desde.lng + (hasta.lng - desde.lng) * t]);
        if (t < 1) this.animacion = requestAnimationFrame(paso);
      };
      this.animacion = requestAnimationFrame(paso);
    }

    // si el vehículo sale de la vista, el mapa lo sigue
    if (!this.mapa.getBounds().pad(-0.1).contains(hasta)) this.mapa.panTo(hasta, { animate: true });
  }
}

/** Rumbo en grados (0 = norte, 90 = este) para ir de un punto a otro */
function rumbo(a: L.LatLng, b: L.LatLng): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

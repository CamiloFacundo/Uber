import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewEncapsulation, effect, input, output, viewChild,
} from '@angular/core';
import * as L from 'leaflet';

export interface Punto {
  lat: number;
  lng: number;
}

const NEIVA: Punto = { lat: 2.9273, lng: -75.2819 };

const ICONO_CARRO =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' +
  '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM7.5 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7 10h10l-1-3H8z"/></svg>';

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
    .rd-mapa-pin.carro span {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 2px solid #ffffff;
      background: #101827;
      color: #ffffff;
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

  /** Se emite cuando el usuario toca el mapa */
  toque = output<Punto>();

  private contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private mapa?: L.Map;
  private capa = L.layerGroup();
  private ruta?: L.Polyline;
  private claveRuta = '';
  private observador?: ResizeObserver;

  constructor() {
    // Cada vez que cambian los puntos, se redibuja el mapa
    effect(() => {
      const datos = {
        origen: this.origen(),
        destino: this.destino(),
        conductor: this.conductor(),
        yo: this.yo(),
        extras: this.extras(),
      };
      if (this.mapa) this.dibujar(datos);
    });
  }

  ngAfterViewInit(): void {
    const oscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.mapa = L.map(this.contenedor().nativeElement, {
      center: [NEIVA.lat, NEIVA.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });
    // Mapa base gris de Esri (gratuito, sin clave): claro u oscuro según el celular
    const capaBase = oscuro ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
    L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${capaBase}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: 'Mapa &copy; Esri, HERE, Garmin, &copy; OpenStreetMap',
    }).addTo(this.mapa);
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);
    this.capa.addTo(this.mapa);
    this.mapa.on('click', (e: L.LeafletMouseEvent) => this.toque.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));

    // Ionic muestra las páginas con animación: cuando el tamaño cambia, Leaflet debe recalcular
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor().nativeElement);
    [100, 400, 900].forEach((ms) => setTimeout(() => this.mapa?.invalidateSize(), ms));

    this.dibujar({
      origen: this.origen(), destino: this.destino(), conductor: this.conductor(), yo: this.yo(), extras: this.extras(),
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  private dibujar(d: { origen: Punto | null; destino: Punto | null; conductor: Punto | null; yo: Punto | null; extras: Punto[] }): void {
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
    marcar(d.yo, 'yo', '', 22);
    marcar(d.origen, 'origen');
    marcar(d.destino, 'destino', '', 26);
    marcar(d.conductor, 'carro', ICONO_CARRO, 32);

    this.dibujarRuta(d.origen, d.destino);

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
      color: '#087f8c', weight: 4, opacity: 0.6, dashArray: '6 8',
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
          color: '#087f8c', weight: 5, opacity: 0.9,
        }).addTo(this.capa);
      })
      .catch(() => undefined); // sin internet: se queda la línea recta
  }
}

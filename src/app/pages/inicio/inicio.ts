import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { DialogModule } from 'primeng/dialog';
import { GalleriaModule } from 'primeng/galleria';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, DialogModule, ButtonModule, CarouselModule, GalleriaModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class.dark') temaOscuro = false;

  mostrarPostulaciones = false;
  mostrarImagenPopup = false;
  mostrarDetalleNoticia = false;
  noticiaSeleccionada: Noticia | null = null;
  seccionActiva = 'noticias';

  private observer?: IntersectionObserver;

  siteConfig = {
    tituloHeader: 'Escuela de Futbol - Inicio',
    tituloBienvenida: '¡Bienvenidos Crack!',
    subtituloBienvenida: 'Revisa las últimas novedades de tu club.',
    imagenDestacada: '',
    imagenesCarrusel: [] as string[],
    imagenesGaleria: [] as GaleriaImg[],
    mostrarPopup: true,
    imagenPopup: '',
    tituloPopup: '',
    cuerpoPopup: '',
  };

  get imgDestacada(): string {
    return this.siteConfig.imagenDestacada || 'media/KevinVasquez.png';
  }

  noticias: Noticia[] = [
    {
      _id: '1',
      titulo: 'Inscripciones Abiertas 2026',
      descripcion:
        'Ya puedes inscribir a tus hijos para el ciclo de invierno en nuestra sede de Viña del Mar. Los cupos son limitados.',
      contenido:
        'Ya puedes inscribir a tus hijos para el ciclo de invierno en nuestra sede de Viña del Mar. Los cupos son limitados y se asignan por orden de llegada. El proceso incluye evaluación técnica, entrega de implementos y charla informativa con el cuerpo técnico. No pierdas esta oportunidad de ser parte del proyecto deportivo más importante de la región.',
      fecha: '2026-04-20',
      imagenUrl: 'media/1449849007-sub.jpg',
      categoria: 'Evento',
    },
    {
      _id: '2',
      titulo: 'Gran Victoria Sub-15',
      descripcion:
        'Nuestros alumnos destacaron en el torneo regional frente a Playa Ancha con una actuación memorable.',
      contenido:
        'Nuestros alumnos de la categoría Sub-15 protagonizaron una actuación memorable en el torneo regional disputado en la cancha principal del club. Con un resultado de 3-1 frente a Playa Ancha, el equipo demostró la calidad de trabajo que se viene realizando durante toda la temporada. El entrenador destacó el espíritu colectivo y la disciplina táctica del grupo.',
      fecha: '2026-04-18',
      imagenUrl: 'media/KevinVasquez.png',
      categoria: 'Partido',
    },
  ];

  partidos: Partido[] = [];

  profesores: any[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.temaOscuro = localStorage.getItem('inicio-tema') === 'oscuro';

    this.http.get<any>('http://localhost:3000/config').subscribe({
      next: (config) => {
        if (config.tituloHeader) this.siteConfig.tituloHeader = config.tituloHeader;
        if (config.tituloBienvenida) this.siteConfig.tituloBienvenida = config.tituloBienvenida;
        if (config.subtituloBienvenida)
          this.siteConfig.subtituloBienvenida = config.subtituloBienvenida;
        if (config.imagenDestacada) this.siteConfig.imagenDestacada = config.imagenDestacada;
        if (Array.isArray(config.imagenesCarrusel) && config.imagenesCarrusel.length > 0)
          this.siteConfig.imagenesCarrusel = config.imagenesCarrusel;
        if (Array.isArray(config.imagenesGaleria) && config.imagenesGaleria.length > 0)
          this.siteConfig.imagenesGaleria = config.imagenesGaleria;
        this.siteConfig.mostrarPopup = config.mostrarPopup ?? true;
        if (config.imagenPopup) this.siteConfig.imagenPopup = config.imagenPopup;
        if (config.tituloPopup) this.siteConfig.tituloPopup = config.tituloPopup;
        if (config.cuerpoPopup) this.siteConfig.cuerpoPopup = config.cuerpoPopup;
        if (this.siteConfig.mostrarPopup) this.mostrarPostulaciones = true;
      },
      error: () => {},
    });

    this.http.get<Noticia[]>('http://localhost:3000/noticias').subscribe({
      next: (data) => {
        if (data && data.length > 0) this.noticias = data;
      },
      error: () => {},
    });

    this.http.get<Partido[]>('http://localhost:3000/partidos').subscribe({
      next: (data) => {
        if (data && data.length > 0) this.partidos = data;
      },
      error: () => {},
    });

    this.http.get<any[]>('http://localhost:3000/planteles').subscribe({
      next: (data) => {
        if (data && data.length > 0) this.profesores = data;
      },
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    const sectionIds = ['noticias', 'partidos', 'galerias', 'planteles'];

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.seccionActiva = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: '-55% 0px -35% 0px' }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) this.observer.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  toggleTema(): void {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('inicio-tema', this.temaOscuro ? 'oscuro' : 'claro');
  }

  scrollTo(section: string): void {
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  verNoticia(noticia: Noticia): void {
    this.noticiaSeleccionada = noticia;
    this.mostrarDetalleNoticia = true;
  }

  abrirPopup(): void {
    this.mostrarPostulaciones = true;
  }

  abrirImagenPopup(): void {
    this.mostrarImagenPopup = true;
  }

  cerrarPopup(): void {
    this.mostrarPostulaciones = false;
  }

  cerrarImagenPopup(): void {
    this.mostrarImagenPopup = false;
  }

  navegarFormulario(): void {
    this.router.navigate(['/formulario']);
    this.cerrarPopup();
  }

  navegarLogin(): void {
    this.router.navigate(['/login']);
  }

  navegarRegistro(): void {
    this.router.navigate(['/pagos/registro']);
  }
}

export interface Noticia {
  _id?: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  fecha: string;
  imagenUrl: string;
  categoria: 'Entrenamiento' | 'Partido' | 'Evento';
}

export interface Partido {
  _id?: string;
  local: string;
  visitante: string;
  fecha: string;
  hora?: string;
  resultado?: string;
  sede?: string;
  tipo: 'proximo' | 'resultado';
}

export interface GaleriaImg {
  url: string;
  descripcion?: string;
}

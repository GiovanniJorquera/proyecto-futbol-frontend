import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RendimientoService } from '../../services/rendimiento.service';

interface RegistroAsistencia {
  jugadorId: string;
  nombre: string;
  categoria: string;
  estado: 'asistio' | 'ausente' | 'justificado';
}

@Component({
  selector: 'app-vista-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vista-profesor.html',
  styleUrl: './vista-profesor.css'
})
export class VistaProfesorComponent implements OnInit {
  @HostBinding('class.dark') temaOscuro = false;

  profesor: any = null;
  usuario: any = null;
  fichas: any[] = [];
  cargando = true;
  error = '';

  tabActiva: 'jugadores' | 'asistencia' | 'rendimiento' = 'jugadores';

  // Asistencia
  fechaSeleccionada = '';
  registros: RegistroAsistencia[] = [];

  // Rendimiento (batch por fecha — conservado)
  fechaRendimiento = '';
  registrosRendimiento: any[] = [];
  guardandoRendimiento = false;
  rendimientoGuardado = false;
  errorRendimiento = '';
  cargandoAsistencia = false;
  guardando = false;
  asistenciaGuardada = false;
  errorAsistencia = '';

  // Rendimiento individual
  jugadorSeleccionadoRend: any = null;
  rendForm = this.rendFormVacio();
  rendHistorial: any[] = [];
  rendResumen: any = {};
  guardandoRendInd = false;
  rendIndGuardado = false;
  errorRendInd = '';
  cargandoRendHist = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private rendimientoService: RendimientoService
  ) {}

  ngOnInit() {
    this.usuario = this.auth.getUsuario();
    this.temaOscuro = localStorage.getItem('tema') === 'dark';
    this.cargarDatos();
  }

  cargarDatos() {
    this.api.getPerfilProfesor().subscribe({
      next: (p) => {
        this.profesor = p;
        this.api.getMisFichas().subscribe({
          next: (f) => { this.fichas = f; this.cargando = false; },
          error: () => { this.error = 'Error al cargar jugadores.'; this.cargando = false; }
        });
      },
      error: () => { this.error = 'Error al cargar perfil del profesor.'; this.cargando = false; }
    });
  }

  cargarAsistenciaFecha() {
    if (!this.fechaSeleccionada) return;
    this.cargandoAsistencia = true;
    this.asistenciaGuardada = false;
    this.errorAsistencia = '';

    this.registros = this.fichas.map(f => ({
      jugadorId: f._id,
      nombre: f.nombre,
      categoria: f.categoria,
      estado: 'asistio' as const
    }));

    this.api.getAsistenciasProfesor(this.fechaSeleccionada).subscribe({
      next: (asistencias) => {
        asistencias.forEach(a => {
          const r = this.registros.find(r => r.jugadorId.toString() === a.jugadorId.toString());
          if (r) r.estado = a.estado;
        });
        this.cargandoAsistencia = false;
      },
      error: () => { this.cargandoAsistencia = false; }
    });
  }

  setEstado(registro: RegistroAsistencia, estado: 'asistio' | 'ausente' | 'justificado') {
    registro.estado = estado;
  }

  guardarAsistencia() {
    if (!this.fechaSeleccionada || this.registros.length === 0) return;
    this.guardando = true;
    this.errorAsistencia = '';

    const payload = this.registros.map(r => ({ jugadorId: r.jugadorId, estado: r.estado }));

    this.api.guardarAsistenciasLote(this.fechaSeleccionada, payload).subscribe({
      next: () => { this.guardando = false; this.asistenciaGuardada = true; },
      error: () => { this.guardando = false; this.errorAsistencia = 'Error al guardar. Intente nuevamente.'; }
    });
  }

  toggleTema() {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('tema', this.temaOscuro ? 'dark' : 'light');
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  calcularEdad(fechaNac: string): number {
    if (!fechaNac) return 0;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  cargarRendimientoFecha() {
    if (!this.fechaRendimiento) return;
    this.rendimientoGuardado = false;
    this.errorRendimiento = '';
    this.registrosRendimiento = this.fichas.map(f => ({
      jugadorId: f._id,
      nombre: f.nombre,
      categoria: f.categoria,
      fisico: 3, tecnico: 3, psicologico: 3, estrategico: 3, notas: ''
    }));
    this.api.getRendimientoProfesorFecha(this.fechaRendimiento).subscribe({
      next: (datos) => {
        datos.forEach(d => {
          const r = this.registrosRendimiento.find(r => r.jugadorId.toString() === d.jugadorId.toString());
          if (r) { r.fisico = d.fisico; r.tecnico = d.tecnico; r.psicologico = d.psicologico; r.estrategico = d.estrategico; r.notas = d.notas || ''; }
        });
      }
    });
  }

  guardarRendimiento() {
    if (!this.fechaRendimiento || !this.registrosRendimiento.length) return;
    this.guardandoRendimiento = true;
    this.errorRendimiento = '';
    this.api.guardarRendimientoProfesor(this.fechaRendimiento, this.registrosRendimiento).subscribe({
      next: () => { this.guardandoRendimiento = false; this.rendimientoGuardado = true; },
      error: () => { this.guardandoRendimiento = false; this.errorRendimiento = 'Error al guardar. Intente nuevamente.'; }
    });
  }

  rendFormVacio() {
    return {
      fisico:      { velocidad: 50, agilidad: 50, resistencia: 50, fuerza: 50, coordinacion: 50 },
      tecnico:     { controlDominio: 50, precisionEjecucion: 50, fluidezMovimiento: 50, usoPerfiles: 50, posturaCorporal: 50 },
      actitudinal: { motivacion: 50, reaccionResultado: 50, apoyoCompanero: 50, deseosSuperacion: 50, resiliencia: 50 },
      estrategico: { tomaDecisiones: 50, lecturaJuego: 50, ocupacionEspacio: 50, transiciones: 50, cumplimientoPlan: 50 },
      comentario: ''
    };
  }

  promedioCat(cat: any): number {
    const vals = Object.values(cat).filter(v => typeof v === 'number') as number[];
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  seleccionarJugadorRend(f: any) {
    this.jugadorSeleccionadoRend = f;
    this.rendForm = this.rendFormVacio();
    this.rendIndGuardado = false;
    this.errorRendInd = '';
    this.cargarHistorialRend();
  }

  cargarHistorialRend() {
    if (!this.jugadorSeleccionadoRend) return;
    this.cargandoRendHist = true;
    this.rendimientoService.obtenerRendimientos(this.jugadorSeleccionadoRend._id).subscribe({
      next: (data) => { this.rendHistorial = data; this.cargandoRendHist = false; },
      error: () => { this.cargandoRendHist = false; }
    });
    this.rendimientoService.obtenerResumen(this.jugadorSeleccionadoRend._id).subscribe({
      next: (data) => { this.rendResumen = data; }
    });
  }

  guardarRendimientoIndividual() {
    this.guardandoRendInd = true;
    this.errorRendInd = '';
    this.rendIndGuardado = false;
    const data = {
      jugadorId:  this.jugadorSeleccionadoRend._id,
      profesorId: this.profesor?._id,
      fisico:      this.rendForm.fisico,
      tecnico:     this.rendForm.tecnico,
      actitudinal: this.rendForm.actitudinal,
      estrategico: this.rendForm.estrategico,
      comentario:  this.rendForm.comentario
    };
    this.rendimientoService.crearRendimiento(data).subscribe({
      next: () => {
        this.guardandoRendInd = false;
        this.rendIndGuardado = true;
        this.rendForm = this.rendFormVacio();
        this.cargarHistorialRend();
      },
      error: () => {
        this.guardandoRendInd = false;
        this.errorRendInd = 'Error al guardar. Intente nuevamente.';
      }
    });
  }

  get divisiones(): string {
    return this.profesor?.divisiones?.join(', ') || '—';
  }

  get totalAsistio(): number {
    return this.registros.filter(r => r.estado === 'asistio').length;
  }

  get totalAusente(): number {
    return this.registros.filter(r => r.estado === 'ausente').length;
  }

  get totalJustificado(): number {
    return this.registros.filter(r => r.estado === 'justificado').length;
  }
}

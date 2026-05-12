import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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

  // Rendimiento
  fechaRendimiento = '';
  registrosRendimiento: any[] = [];
  guardandoRendimiento = false;
  rendimientoGuardado = false;
  errorRendimiento = '';
  cargandoAsistencia = false;
  guardando = false;
  asistenciaGuardada = false;
  errorAsistencia = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 22a3e76 (Entrega 2)

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgFor, NgIf, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstadoPago, Pago } from '../models/pago';
import { PagosService } from '../services/pagos.service';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, CurrencyPipe, FormsModule, TableModule, ButtonModule, CardModule, DialogModule, TagModule, InputTextModule, SelectModule, ToggleButtonModule, TextareaModule, ToastModule, ChartModule],
  providers: [MessageService],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit {

  /* ── SOLICITUDES ──────────────────────────────── */
  solicitudes: any[] = [];
  cargando = true;
  solicitudSeleccionada: any = null;
  modalSolicitudVisible = false;

  filtros = { texto: '', estado: null as string | null, comuna: null as string | null, edadMin: null as number | null, edadMax: null as number | null };

  estadoOpciones = [
    { label: 'Todos', value: null },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Aprobado', value: 'aprobado' },
    { label: 'Rechazado', value: 'rechazado' },
  ];

  get comunaOpciones() {
    const unicas = [...new Set(this.solicitudes.map(s => s.pupilo?.comuna?.name).filter(Boolean))];
    return [{ label: 'Todas', value: null }, ...unicas.map(c => ({ label: c, value: c }))];
  }

  get solicitudesFiltradas() {
    return this.solicitudes.filter(s => {
      const texto = this.filtros.texto.trim().toLowerCase();
      if (texto) {
        const nombre = `${s.pupilo?.nombre ?? ''} ${s.pupilo?.apellidoPaterno ?? ''} ${s.pupilo?.apellidoMaterno ?? ''}`.toLowerCase();
        const rut = (s.pupilo?.rut ?? '').toLowerCase();
        const apoderado = `${s.apoderado?.nombre ?? ''} ${s.apoderado?.apellidos ?? ''}`.toLowerCase();
        const comuna = (s.pupilo?.comuna?.name ?? '').toLowerCase();
        if (!nombre.includes(texto) && !rut.includes(texto) && !apoderado.includes(texto) && !comuna.includes(texto)) return false;
      }
      if (this.filtros.estado && (s.estado || 'pendiente') !== this.filtros.estado) return false;
      if (this.filtros.comuna && s.pupilo?.comuna?.name !== this.filtros.comuna) return false;
      if (this.filtros.edadMin !== null || this.filtros.edadMax !== null) {
        const edad = this.calcularEdad(s.pupilo?.fechaNacimiento);
        if (this.filtros.edadMin !== null && edad < this.filtros.edadMin) return false;
        if (this.filtros.edadMax !== null && edad > this.filtros.edadMax) return false;
      }
      return true;
    });
  }

  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date(), nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  limpiarFiltros() { this.filtros = { texto: '', estado: null, comuna: null, edadMin: null, edadMax: null }; }

  /* ── FILTROS ─────────────────────────────────── */
  filtrosFichas     = { texto: '', categoria: null as string | null, conCuenta: null as boolean | null };
  filtrosProfesores = { texto: '', division: null as string | null };
  filtrosDivisiones = { texto: '' };
  filtrosPartidos   = { texto: '', tipo: null as string | null };

  /* ── FICHAS DE TEMPORADA / JUGADORES ─────────── */
  fichas: any[] = [];
  cargandoFichas = false;
  tabFichasLoaded = false;
  tabJugadoresLoaded = false;
  fichaSeleccionada: any = null;
  modalFichaVisible = false;
  credencialesCliente: { email: string; passwordTemporal: string } | null = null;
  modalCredencialesVisible = false;
  modalEditarFichaVisible = false;
  fichaEditandoForm: any = {};

  /* Filtros jugadores (tab separado) */
  filtrosJugadores = { texto: '', categoria: null as string | null, posicion: null as string | null, sede: null as string | null };

  /* Rendimiento */
  modalRendimientoVisible = false;
  rendimientoJugador: any[] = [];
  cargandoRendimiento = false;
  rendChartData: any = null;
  rendChartOptions: any = null;
  rendZoomAnio: number | null = null;
  rendZoomMes: number | null = null;

  posicionOpciones = [
    { label: '— Sin posición —', value: '' },
    { label: 'Arquero', value: 'Arquero' },
    { label: 'Defensa', value: 'Defensa' },
    { label: 'Mediocampista', value: 'Mediocampista' },
    { label: 'Delantero', value: 'Delantero' },
  ];
  pieHabilOpciones = [
    { label: '— Sin especificar —', value: '' },
    { label: 'Derecho', value: 'Derecho' },
    { label: 'Izquierdo', value: 'Izquierdo' },
    { label: 'Ambidiestro', value: 'Ambidiestro' },
  ];
  actitudSocialOpciones = [
    { label: '— Sin especificar —', value: '' },
    { label: 'Introvertido', value: 'Introvertido' },
    { label: 'Extrovertido', value: 'Extrovertido' },
    { label: 'Mixto', value: 'Mixto' },
  ];
  cuentaOpciones = [
    { label: 'Todos', value: null },
    { label: 'Con acceso al portal', value: true },
    { label: 'Sin acceso al portal', value: false },
  ];

  /* ── PROFESORES ───────────────────────────────── */
  profesores: any[] = [];
  profesorForm = { nombre: '', apellido: '', rut: '', especialidad: '', experiencia: '', divisionesTexto: '', telefono: '', sede: '' };
  profesorEditando: any = null;
  modalProfesorVisible = false;
  credencialesProfesor: { email: string; passwordTemporal: string } | null = null;
  modalCredencialesProfesorVisible = false;

  /* ── DIVISIONES ───────────────────────────────── */
  divisiones: any[] = [];
  divisionForm = { nombre: '', categoria: '', profesorPrincipal: '', estudiantes: 0 };
  divisionEditando: any = null;
  modalDivisionVisible = false;

  /* ── PAGOS ────────────────────────────────────── */
  pagosPendientes: Pago[] = [];
  pagosAprobados: Pago[] = [];
  pagoSeleccionado: Pago | null = null;
  modalVoucherVisible = false;
  cargandoPagos = false;
  cargandoAprobados = false;

  /* ── PARTIDOS ─────────────────────────────────── */
  partidos: any[] = [];
  partidoForm = { local: 'Santiago Wanderers', visitante: '', fecha: '', hora: '', resultado: '', sede: '', tipo: 'proximo' };
  partidoEditando: any = null;
  modalPartidoVisible = false;
  tipoPartidoOpciones = [
    { label: 'Próximo partido', value: 'proximo' },
    { label: 'Resultado', value: 'resultado' },
  ];


  /* ── INICIO (config + noticias) ───────────────── */
  activeTab = 'solicitudes';
  siteConfig = {
    tituloHeader: '',
    tituloBienvenida: '',
    subtituloBienvenida: '',
    imagenDestacada: '',
    imagenesCarrusel: [] as string[],
    imagenesGaleria: [] as { url: string; descripcion: string }[],
    mostrarPopup: true,
    imagenPopup: '',
    tituloPopup: '',
    cuerpoPopup: '',
    sedes: [] as string[],
  };
  nuevaSede = '';
  guardandoConfig = false;
  noticiasAdmin: any[] = [];
  noticiaForm: { titulo: string; descripcion: string; contenido: string; fecha: string; imagenUrl: string; categoria: string } = { titulo: '', descripcion: '', contenido: '', fecha: '', imagenUrl: '', categoria: '' };
  noticiaEditando: any = null;
  modalNoticiaVisible = false;
  categoriasOpciones = [
    { label: 'Evento', value: 'Evento' },
    { label: 'Partido', value: 'Partido' },
    { label: 'Entrenamiento', value: 'Entrenamiento' },
  ];

  /* ── MIGRACIÓN CSV ───────────────────────────────── */
  migracionEnCurso  = false;
  migracionResultado = '';

  ejecutarMigracionCSV() {
    if (this.migracionEnCurso) return;
    this.migracionEnCurso = true;
    this.migracionResultado = '';
    this.http.post<any>(`${this.apiUrl}/admin/migracion-fichas-csv`, {}, this.authHeaders()).subscribe({
      next: (r) => {
        this.migracionEnCurso = false;
        this.migracionResultado = r.mensaje + (r.errores ? ` (${r.errores} errores)` : '');
        this.cargarFichas();
        this.tabLibroLoaded = false;
        this.libroJugadores = [];
        this.libroFechas    = [];
      },
      error: (err) => {
        this.migracionEnCurso = false;
        this.migracionResultado = 'Error: ' + (err?.error?.detalle || err?.error?.mensaje || 'desconocido');
      }
    });
  }

  /* ── LIBRO DE ASISTENCIA ─────────────────────────── */
  libroMes      = (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`; })();
  libroCat      : string | null = null;
  libroSede     : string | null = null;
  libroFechas   : string[] = [];
  libroJugadores: any[]   = [];
  cargandoLibro  = false;
  tabLibroLoaded = false;
  libroError     = '';

  /* ── CONFIRMACIÓN PERSONALIZADA ──────────────────── */
  confirmarVisible = false;
  confirmarHeader  = '';
  confirmarMensaje = '';
  confirmarLabel   = 'Confirmar';
  confirmarSeverity: 'success' | 'danger' | 'secondary' = 'danger';
  private confirmarCallback: (() => void) | null = null;

  ejecutarConfirmar() {
    this.confirmarVisible = false;
    const cb = this.confirmarCallback;
    this.confirmarCallback = null;
    if (cb) cb();
  }

  /* Edición de celda en libro */
  libroEditandoCelda: { jugadorId: string; fecha: string } | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private pagosService: PagosService,
    private authService: AuthService,
    private messageService: MessageService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  private readonly apiUrl = environment.apiUrl;

  ngOnInit() {
    this.cargarSolicitudes();
    this.cargarProfesores();
    this.cargarDivisiones();
    this.cargarPartidos();
    this.cargarPendientes();
    this.cargarAprobados();
    this.cargarConfig();
    this.cargarNoticiasAdmin();
  }

  private authHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` }) };
  }

  private toast(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }

  private confirmar(msg: string, header: string, _icon: string, acceptLabel: string, acceptClass: string, onAccept: () => void) {
    const severityMap: Record<string, 'success' | 'danger' | 'secondary'> = {
      'p-button-success':   'success',
      'p-button-danger':    'danger',
      'p-button-primary':   'danger',
    };
    this.confirmarHeader   = header;
    this.confirmarMensaje  = msg;
    this.confirmarLabel    = acceptLabel;
    this.confirmarSeverity = severityMap[acceptClass] ?? 'danger';
    this.confirmarCallback = onAccept;
    this.confirmarVisible  = true;
  }

  /* ── SOLICITUDES ──────────────────────────────── */
  cargarSolicitudes() {
    this.cargando = true;
    this.http.get<any[]>(`${this.apiUrl}/inscripciones`, this.authHeaders()).subscribe({
      next: (data) => { this.solicitudes = data; this.cargando = false; },
      error: () => { this.toast('error', 'Error', 'No se pudieron cargar las solicitudes.'); this.cargando = false; }
    });
  }

  aprobar(id: string) {
    this.confirmar('¿Estás seguro de <strong>aprobar</strong> a este jugador?', 'Aprobar inscripción', 'pi pi-check-circle', 'Sí, aprobar', 'p-button-success', () => {
      this.http.put(`${this.apiUrl}/aprobar/${id}`, {}, this.authHeaders()).subscribe({
        next: () => { this.toast('success', 'Aprobado', 'El jugador fue aprobado.'); this.modalSolicitudVisible = false; this.cargarSolicitudes(); },
        error: () => this.toast('error', 'Error', 'No se pudo aprobar al jugador.')
      });
    });
  }

  rechazar(id: string) {
    this.confirmar('¿Estás seguro de <strong>rechazar</strong> a este jugador?', 'Rechazar inscripción', 'pi pi-exclamation-triangle', 'Sí, rechazar', 'p-button-danger', () => {
      this.http.put(`${this.apiUrl}/rechazar/${id}`, {}, this.authHeaders()).subscribe({
        next: () => { this.toast('warn', 'Rechazado', 'El jugador fue rechazado.'); this.modalSolicitudVisible = false; this.cargarSolicitudes(); },
        error: () => this.toast('error', 'Error', 'No se pudo rechazar al jugador.')
      });
    });
  }

  verDetalle(solicitud: any) { this.solicitudSeleccionada = solicitud; this.modalSolicitudVisible = true; }

  /* ── PROFESORES ───────────────────────────────── */
  cargarProfesores() {
    this.http.get<any[]>(`${this.apiUrl}/profesores`, this.authHeaders()).subscribe({
      next: (data) => this.profesores = data,
      error: () => {}
    });
  }

  abrirModalProfesor(p?: any) {
    this.profesorEditando = p || null;
    this.profesorForm = p
      ? { nombre: p.nombre, apellido: p.apellido || '', rut: p.rut || '', especialidad: p.especialidad || '', experiencia: p.experiencia || '', divisionesTexto: (p.divisiones || []).join(', '), telefono: p.telefono || '', sede: p.sede || '' }
      : { nombre: '', apellido: '', rut: '', especialidad: '', experiencia: '', divisionesTexto: '', telefono: '', sede: '' };
    this.modalProfesorVisible = true;
  }

  guardarProfesor() {
    if (!this.profesorForm.nombre) { this.toast('warn', 'Campo requerido', 'El nombre es obligatorio.'); return; }
    const divisiones = this.profesorForm.divisionesTexto.split(',').map(d => d.trim()).filter(Boolean);

    if (this.profesorEditando) {
      const data = { ...this.profesorForm, divisiones };
      this.http.put(`${this.apiUrl}/profesores/${this.profesorEditando._id}`, data, this.authHeaders()).subscribe({
        next: () => { this.modalProfesorVisible = false; this.toast('success', 'Guardado', 'Profesor actualizado.'); this.cargarProfesores(); },
        error: () => this.toast('error', 'Error', 'No se pudo actualizar el profesor.')
      });
    } else {
      if (!this.profesorForm.apellido || !this.profesorForm.rut) {
        this.toast('warn', 'Campos requeridos', 'Apellido y RUT son obligatorios para crear el acceso.'); return;
      }
      const data = {
        nombre: this.profesorForm.nombre,
        apellido: this.profesorForm.apellido,
        rut: this.profesorForm.rut,
        especialidad: this.profesorForm.especialidad,
        experiencia: this.profesorForm.experiencia,
        telefono: this.profesorForm.telefono,
        sede: this.profesorForm.sede,
        divisiones
      };
      this.http.post<any>(`${this.apiUrl}/profesores/crear-acceso`, data, this.authHeaders()).subscribe({
        next: (res) => {
          this.modalProfesorVisible = false;
          this.credencialesProfesor = res.credenciales;
          this.modalCredencialesProfesorVisible = true;
          this.cargarProfesores();
        },
        error: (err) => this.toast('error', 'Error', err?.error?.mensaje || 'No se pudo crear el profesor.')
      });
    }
  }

  eliminarProfesor(id: string) {
    this.confirmar('¿Eliminar este profesor?', 'Eliminar profesor', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.http.delete(`${this.apiUrl}/profesores/${id}`, this.authHeaders()).subscribe({
        next: () => { this.toast('success', 'Eliminado', 'Profesor eliminado.'); this.cargarProfesores(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── DIVISIONES ───────────────────────────────── */
  cargarDivisiones() {
    this.http.get<any[]>(`${this.apiUrl}/divisiones`, this.authHeaders()).subscribe({
      next: (data) => this.divisiones = data,
      error: () => {}
    });
  }

  abrirModalDivision(d?: any) {
    this.divisionEditando = d || null;
    this.divisionForm = d
      ? { nombre: d.nombre, categoria: d.categoria, profesorPrincipal: d.profesorPrincipal, estudiantes: d.estudiantes }
      : { nombre: '', categoria: '', profesorPrincipal: '', estudiantes: 0 };
    this.modalDivisionVisible = true;
  }

  guardarDivision() {
    if (!this.divisionForm.nombre) { this.toast('warn', 'Campo requerido', 'El nombre es obligatorio.'); return; }
    const req = this.divisionEditando
      ? this.http.put(`${this.apiUrl}/divisiones/${this.divisionEditando._id}`, this.divisionForm, this.authHeaders())
      : this.http.post(`${this.apiUrl}/divisiones`, this.divisionForm, this.authHeaders());
    req.subscribe({
      next: () => { this.modalDivisionVisible = false; this.toast('success', 'Guardado', `División ${this.divisionEditando ? 'actualizada' : 'agregada'}.`); this.cargarDivisiones(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar la división.')
    });
  }

  eliminarDivision(id: string) {
    this.confirmar('¿Eliminar esta división?', 'Eliminar división', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.http.delete(`${this.apiUrl}/divisiones/${id}`, this.authHeaders()).subscribe({
        next: () => { this.toast('success', 'Eliminada', 'División eliminada.'); this.cargarDivisiones(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── PARTIDOS ─────────────────────────────────── */
  cargarPartidos() {
    this.http.get<any[]>(`${this.apiUrl}/partidos`).subscribe({
      next: (data) => this.partidos = data,
      error: () => {}
    });
  }

  abrirModalPartido(p?: any) {
    this.partidoEditando = p || null;
    this.partidoForm = p
      ? { local: p.local || 'Santiago Wanderers', visitante: p.visitante, fecha: p.fecha || '', hora: p.hora || '', resultado: p.resultado || '', sede: p.sede || '', tipo: p.tipo || 'proximo' }
      : { local: 'Santiago Wanderers', visitante: '', fecha: '', hora: '', resultado: '', sede: '', tipo: 'proximo' };
    this.modalPartidoVisible = true;
  }

  guardarPartido() {
    if (!this.partidoForm.visitante.trim()) { this.toast('warn', 'Campo requerido', 'El equipo visitante es obligatorio.'); return; }
    const req = this.partidoEditando
      ? this.http.put(`${this.apiUrl}/partidos/${this.partidoEditando._id}`, this.partidoForm, this.authHeaders())
      : this.http.post(`${this.apiUrl}/partidos`, this.partidoForm, this.authHeaders());
    req.subscribe({
      next: () => { this.modalPartidoVisible = false; this.toast('success', 'Guardado', `Partido ${this.partidoEditando ? 'actualizado' : 'agregado'}.`); this.cargarPartidos(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar el partido.')
    });
  }

  eliminarPartido(id: string) {
    this.confirmar('¿Eliminar este partido?', 'Eliminar partido', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.http.delete(`${this.apiUrl}/partidos/${id}`, this.authHeaders()).subscribe({
        next: () => { this.toast('success', 'Eliminado', 'Partido eliminado.'); this.cargarPartidos(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── PAGOS ────────────────────────────────────── */
  cargarAprobados(): void {
    this.cargandoAprobados = true;
    this.pagosService.getPagosAprobados().pipe(
      timeout(5000),
      catchError(() => {
        this.toast('warn', 'Atención', 'No se pudo cargar los pagos aprobados.');
        return of([] as Pago[]);
      })
    ).subscribe((pagos) => {
      this.pagosAprobados = pagos;
      this.cargandoAprobados = false;
    });
  }

  vincularPagoMensual(pago: Pago): void {
    this.confirmar(
      `¿Marcar el pago de <strong>${pago.alumno}</strong> como pagado este mes en Ficha-Temporada?`,
      'Vincular pago mensual', 'pi pi-link', 'Sí, vincular', 'p-button-success',
      () => {
        this.http.post<any>(`${this.apiUrl}/admin/vincular-pago-mensual/${pago.id}`, {}, this.authHeaders()).subscribe({
          next: () => {
            this.toast('success', 'Vinculado', 'Pago mensual marcado como pagado.');
            if (this.fichas.length > 0) this.cargarFichas();
          },
          error: (err) => this.toast('error', 'Error', err?.error?.mensaje || 'No se pudo vincular el pago.')
        });
      }
    );
  }

  rechazarPagoAprobado(pago: Pago): void {
    this.confirmar(
      `¿Confirmas <strong>rechazar</strong> el pago de ${pago.alumno}? Esta acción lo moverá a rechazados.`,
      'Rechazar pago aprobado',
      'pi pi-exclamation-triangle',
      'Sí, rechazar',
      'p-button-danger',
      () => {
        this.pagosService.updateEstadoPago(pago.id, 'rechazado').subscribe({
          next: () => {
            this.pagosAprobados = this.pagosAprobados.filter(p => p.id !== pago.id);
            if (this.pagoSeleccionado?.id === pago.id) { this.modalVoucherVisible = false; this.pagoSeleccionado = null; }
            this.toast('warn', 'Pago rechazado', `El pago de ${pago.alumno} fue movido a rechazados.`);
            this.cargarPendientes();
          },
          error: () => this.toast('error', 'Error', 'No se pudo actualizar el estado del pago.')
        });
      }
    );
  }

  cargarPendientes(): void {
    this.cargandoPagos = true;
    this.pagosService.getPagosPendientes().pipe(
      timeout(5000),
      catchError(() => {
        this.toast('warn', 'Atención', 'No se pudo conectar al servidor de pagos.');
        return of([] as Pago[]);
      })
    ).subscribe((pagos) => {
      this.pagosPendientes = pagos;
      this.cargandoPagos = false;
    });
  }

  verVoucher(pago: Pago): void {
    if (pago.voucherBase64) {
      this.pagoSeleccionado = pago;
      this.modalVoucherVisible = true;
    } else {
      this.http.get<any>(`${this.apiUrl}/pagos/${pago.id}`, this.authHeaders()).subscribe({
        next: (full) => { this.pagoSeleccionado = { ...pago, voucherBase64: full.voucherBase64 }; this.modalVoucherVisible = true; },
        error: () => this.toast('error', 'Error', 'No se pudo cargar el voucher.')
      });
    }
  }

  cambiarEstado(pago: Pago, estado: EstadoPago): void {
    const aprobando = estado === 'aprobado';
    this.confirmar(
      `¿Confirmas <strong>${aprobando ? 'aprobar' : 'rechazar'}</strong> el pago de ${pago.alumno}?`,
      aprobando ? 'Aprobar pago' : 'Rechazar pago',
      aprobando ? 'pi pi-check-circle' : 'pi pi-times-circle',
      aprobando ? 'Sí, aprobar' : 'Sí, rechazar',
      aprobando ? 'p-button-success' : 'p-button-danger',
      () => {
        this.pagosService.updateEstadoPago(pago.id, estado).subscribe({
          next: () => {
            this.pagosPendientes = this.pagosPendientes.filter(i => i.id !== pago.id);
            if (this.pagoSeleccionado?.id === pago.id) { this.modalVoucherVisible = false; this.pagoSeleccionado = null; }
            this.toast('success', aprobando ? 'Pago aprobado' : 'Pago rechazado', `El pago de ${pago.alumno} fue procesado.`);
            if (aprobando) this.cargarAprobados();
          },
          error: () => this.toast('error', 'Error', 'No se pudo actualizar el pago.')
        });
      }
    );
  }

  /* ── CONFIG / NOTICIAS ────────────────────────── */
  cargarConfig(): void {
    this.http.get<any>(`${this.apiUrl}/config`).subscribe({
      next: (c) => {
        this.siteConfig.tituloHeader = c.tituloHeader || 'Escuela de Futbol - Inicio';
        this.siteConfig.tituloBienvenida = c.tituloBienvenida || '¡Bienvenidos Crack!';
        this.siteConfig.subtituloBienvenida = c.subtituloBienvenida || 'Revisa las últimas novedades de tu club.';
        this.siteConfig.imagenDestacada = c.imagenDestacada || '';
        this.siteConfig.imagenesCarrusel = c.imagenesCarrusel || [];
        this.siteConfig.imagenesGaleria = c.imagenesGaleria || [];
        this.siteConfig.mostrarPopup = c.mostrarPopup !== undefined ? c.mostrarPopup : true;
        this.siteConfig.imagenPopup = c.imagenPopup || '';
        this.siteConfig.tituloPopup = c.tituloPopup || '';
        this.siteConfig.cuerpoPopup = c.cuerpoPopup || '';
        this.siteConfig.sedes = c.sedes?.length ? c.sedes : ['Viña del Mar', 'Olmué'];
      },
      error: () => {},
    });
  }

  private comprimirImagen(file: File, maxW: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async agregarImagenCarrusel(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const b64 = await this.comprimirImagen(file, 1920, 0.92);
    this.siteConfig.imagenesCarrusel = [...this.siteConfig.imagenesCarrusel, b64];
    input.value = '';
  }

  eliminarImagenCarrusel(i: number) {
    this.siteConfig.imagenesCarrusel = this.siteConfig.imagenesCarrusel.filter((_, idx) => idx !== i);
  }

  async agregarImagenGaleria(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const b64 = await this.comprimirImagen(file, 1600, 0.90);
    this.siteConfig.imagenesGaleria = [...this.siteConfig.imagenesGaleria, { url: b64, descripcion: '' }];
    input.value = '';
  }

  eliminarImagenGaleria(i: number) {
    this.siteConfig.imagenesGaleria = this.siteConfig.imagenesGaleria.filter((_, idx) => idx !== i);
  }

  async seleccionarImagenPopup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const b64 = await this.comprimirImagen(file, 1200, 0.90);
    this.siteConfig.imagenPopup = b64;
    input.value = '';
  }

  async seleccionarImagenDestacada(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.siteConfig.imagenDestacada = await this.comprimirImagen(file, 1920, 0.92);
    input.value = '';
  }

  private putConfig(payload: object): void {
    this.guardandoConfig = true;
    this.http.put<any>(`${this.apiUrl}/config`, payload, this.authHeaders()).subscribe({
      next: (res) => {
        this.guardandoConfig = false;
        if (res && res.imagenesCarrusel) this.siteConfig.imagenesCarrusel = res.imagenesCarrusel;
        if (res && res.imagenesGaleria)  this.siteConfig.imagenesGaleria  = res.imagenesGaleria;
        this.toast('success', 'Guardado', 'Configuración actualizada.');
      },
      error: (err) => {
        this.guardandoConfig = false;
        const detalle = err?.error?.detalle || err?.message || '';
        this.toast('error', 'Error al guardar', detalle || 'No se pudo guardar la configuración.');
      },
    });
  }

  guardarTextos(): void {
    this.putConfig({
      tituloHeader:        this.siteConfig.tituloHeader,
      tituloBienvenida:    this.siteConfig.tituloBienvenida,
      subtituloBienvenida: this.siteConfig.subtituloBienvenida,
      imagenDestacada:     this.siteConfig.imagenDestacada,
    });
  }

  guardarCarrusel(): void {
    this.putConfig({ imagenesCarrusel: this.siteConfig.imagenesCarrusel });
  }

  guardarGaleria(): void {
    this.putConfig({ imagenesGaleria: this.siteConfig.imagenesGaleria });
  }

  guardarPopup(): void {
    this.putConfig({
      mostrarPopup: this.siteConfig.mostrarPopup,
      imagenPopup:  this.siteConfig.imagenPopup,
      tituloPopup:  this.siteConfig.tituloPopup,
      cuerpoPopup:  this.siteConfig.cuerpoPopup,
    });
  }

  agregarSede(): void {
    const s = this.nuevaSede.trim();
    if (!s || this.siteConfig.sedes.includes(s)) { this.nuevaSede = ''; return; }
    this.siteConfig.sedes = [...this.siteConfig.sedes, s];
    this.nuevaSede = '';
    this.putConfig({ sedes: this.siteConfig.sedes });
  }

  eliminarSede(i: number): void {
    this.siteConfig.sedes = this.siteConfig.sedes.filter((_, idx) => idx !== i);
    this.putConfig({ sedes: this.siteConfig.sedes });
  }

  guardarConfig(): void {
    this.putConfig(this.siteConfig);
  }

  cargarNoticiasAdmin(): void {
    this.http.get<any[]>(`${this.apiUrl}/noticias`).subscribe({ next: (d) => this.noticiasAdmin = d, error: () => {} });
  }

  abrirModalNoticia(n?: any): void {
    this.noticiaEditando = n || null;
    this.noticiaForm = n
      ? { titulo: n.titulo, descripcion: n.descripcion, contenido: n.contenido || '', fecha: n.fecha, imagenUrl: n.imagenUrl, categoria: n.categoria }
      : { titulo: '', descripcion: '', contenido: '', fecha: '', imagenUrl: '', categoria: '' };
    this.modalNoticiaVisible = true;
  }

  guardarNoticia(): void {
    if (!this.noticiaForm.titulo) { this.toast('warn', 'Campo requerido', 'El título es obligatorio.'); return; }
    const req = this.noticiaEditando
      ? this.http.put(`${this.apiUrl}/noticias/${this.noticiaEditando._id}`, this.noticiaForm, this.authHeaders())
      : this.http.post(`${this.apiUrl}/noticias`, this.noticiaForm, this.authHeaders());
    req.subscribe({
      next: () => { this.modalNoticiaVisible = false; this.toast('success', 'Guardado', `Noticia ${this.noticiaEditando ? 'actualizada' : 'creada'}.`); this.cargarNoticiasAdmin(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar la noticia.'),
    });
  }

  eliminarNoticia(id: string): void {
    this.confirmar('¿Eliminar esta noticia? Esta acción no se puede deshacer.', 'Eliminar noticia', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.http.delete(`${this.apiUrl}/noticias/${id}`, this.authHeaders()).subscribe({
        next: () => { this.toast('success', 'Eliminada', 'Noticia eliminada.'); this.cargarNoticiasAdmin(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar la noticia.'),
      });
    });
  }

  /* ── FICHAS DE TEMPORADA ─────────────────────── */
  cargarFichas() {
    this.cargandoFichas = true;
    this.http.get<any[]>(`${this.apiUrl}/ficha-temporada`, this.authHeaders()).subscribe({
      next: (data) => { this.fichas = data; this.cargandoFichas = false; },
      error: () => { this.toast('error', 'Error', 'No se pudieron cargar las fichas.'); this.cargandoFichas = false; }
    });
  }

  verDetalleFicha(ficha: any) { this.fichaSeleccionada = ficha; this.modalFichaVisible = true; }

  abrirEditarFicha(ficha: any) {
    this.fichaSeleccionada = ficha;
    this.fichaEditandoForm = {
      nombre: ficha.nombre || '',
      apellidoPaterno: ficha.apellidoPaterno || '',
      apellidoMaterno: ficha.apellidoMaterno || '',
      fechaNacimiento: ficha.fechaNacimiento ? ficha.fechaNacimiento.split('T')[0] : '',
      cedula: ficha.cedula || '',
      direccion: ficha.direccion || '',
      ciudad: ficha.ciudad || '',
      sede: ficha.sede || '',
      establecimiento: ficha.establecimiento || '',
      curso: ficha.curso || '',
      clubAmateur: ficha.clubAmateur || '',
      talla: ficha.talla || '',
      nombreCamiseta: ficha.nombreCamiseta || '',
      posicion: ficha.posicion || '',
      pieHabil: ficha.pieHabil || '',
      numerosFavoritosTexto: (ficha.numerosFavoritos || []).join(', '),
      aniosJugando: ficha.aniosJugando || '',
      otrosDeportes: ficha.otrosDeportes || '',
      otrasEscuelas: ficha.otrasEscuelas || '',
      actitudSocial: ficha.actitudSocial || '',
      actitudAdversidad: ficha.actitudAdversidad || '',
      beca: ficha.beca || false,
      apoderado: {
        nombre: ficha.apoderado?.nombre || '',
        direccion: ficha.apoderado?.direccion || '',
        ciudad: ficha.apoderado?.ciudad || '',
        rut: ficha.apoderado?.rut || '',
        correo: ficha.apoderado?.correo || '',
        telefonoCasa: ficha.apoderado?.telefonoCasa || '',
        whatsapp: ficha.apoderado?.whatsapp || '',
        vinculo: ficha.apoderado?.vinculo || '',
      }
    };
    this.modalFichaVisible = false;
    this.modalEditarFichaVisible = true;
  }

  guardarEdicionFicha() {
    if (!this.fichaEditandoForm.nombre?.trim()) {
      this.toast('warn', 'Campo requerido', 'El nombre es obligatorio.'); return;
    }
    const datos = {
      ...this.fichaEditandoForm,
      numerosFavoritos: this.fichaEditandoForm.numerosFavoritosTexto
        ? this.fichaEditandoForm.numerosFavoritosTexto.split(',').map((n: string) => Number(n.trim())).filter((n: number) => !isNaN(n))
        : []
    };
    delete datos.numerosFavoritosTexto;
    this.http.put<any>(`${this.apiUrl}/ficha-temporada/${this.fichaSeleccionada._id}`, datos, this.authHeaders()).subscribe({
      next: () => { this.modalEditarFichaVisible = false; this.toast('success', 'Guardado', 'Jugador actualizado correctamente.'); this.cargarFichas(); },
      error: (err) => this.toast('error', 'Error', err?.error?.mensaje || 'No se pudo guardar.')
    });
  }

  eliminarFicha(id: string) {
    this.modalEditarFichaVisible = false;
    this.confirmar(
      '¿Estás seguro de <strong>eliminar</strong> a este jugador? Se eliminará la ficha y el acceso al portal si existía.',
      'Eliminar jugador', 'pi pi-exclamation-triangle', 'Sí, eliminar', 'p-button-danger',
      () => {
        this.http.delete(`${this.apiUrl}/ficha-temporada/${id}`, this.authHeaders()).subscribe({
          next: () => {
            this.modalEditarFichaVisible = false;
            this.modalFichaVisible = false;
            this.toast('success', 'Eliminado', 'Jugador eliminado correctamente.');
            this.cargarFichas();
          },
          error: () => this.toast('error', 'Error', 'No se pudo eliminar el jugador.')
        });
      }
    );
  }

  crearCuentaCliente(fichaId: string) {
    this.modalFichaVisible = false;
    this.confirmar(
      '¿Crear cuenta de acceso al portal para el apoderado de esta ficha?',
      'Crear cuenta cliente', 'pi pi-user-plus', 'Sí, crear', 'p-button-success',
      () => {
        this.http.post<any>(`${this.apiUrl}/admin/crear-cliente-ficha/${fichaId}`, {}, this.authHeaders()).subscribe({
          next: (res) => {
            this.credencialesCliente = { email: res.email, passwordTemporal: res.passwordTemporal };
            this.modalFichaVisible = false;
            this.modalCredencialesVisible = true;
          },
          error: (err) => this.toast('error', 'Error', err?.error?.mensaje || 'No se pudo crear la cuenta.')
        });
      }
    );
  }

  /* ── HELPERS ──────────────────────────────────── */
  setActiveTab(tab: string) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    if (tab === 'fichas' || tab === 'jugadores' || tab === 'divisiones' || tab === 'arqueros') {
      if (tab === 'fichas') this.tabFichasLoaded = true;
      if (tab === 'jugadores') this.tabJugadoresLoaded = true;
      if (this.fichas.length === 0 && !this.cargandoFichas) this.cargarFichas();
    }
    if (tab === 'asistencia') {
      this.tabLibroLoaded = true;
      this.cargarLibroAdmin();
    }
    this.modalSolicitudVisible = false;
    this.modalProfesorVisible = false;
    this.modalCredencialesProfesorVisible = false;
    this.modalDivisionVisible = false;
    this.modalPartidoVisible = false;
    this.modalNoticiaVisible = false;
    this.modalFichaVisible = false;
    this.modalEditarFichaVisible = false;
    this.modalCredencialesVisible = false;
    this.modalRendimientoVisible = false;
    this.modalVoucherVisible = false;
    this.confirmarVisible = false;
  }

  /* Ficha-Temporada */
  get fichasFiltradas() {
    return this.fichas.filter((f: any) => {
      const t = this.filtrosFichas.texto.trim().toLowerCase();
      if (t) {
        const n = `${f.nombre || ''} ${f.apellidoPaterno || ''} ${f.apellidoMaterno || ''} ${f.apellido || ''}`.toLowerCase();
        const c = (f.cedula || '').toLowerCase();
        const a = (f.apoderado?.nombre || '').toLowerCase();
        if (!n.includes(t) && !c.includes(t) && !a.includes(t)) return false;
      }
      if (this.filtrosFichas.categoria && f.categoria !== this.filtrosFichas.categoria) return false;
      if (this.filtrosFichas.conCuenta !== null && f.tieneCuenta !== this.filtrosFichas.conCuenta) return false;
      return true;
    });
  }
  get totalConCuenta() { return this.fichas.filter((f: any) => f.tieneCuenta).length; }
  get totalBeca()      { return this.fichas.filter((f: any) => f.beca).length; }
  limpiarFiltrosFichas() { this.filtrosFichas = { texto: '', categoria: null, conCuenta: null }; }

  generarLinkRegistro() {
    this.http.post<{ token: string }>(`${this.apiUrl}/admin/generar-invitacion`, {}, this.authHeaders()).subscribe({
      next: ({ token }) => {
        const url = `${window.location.origin}/registrar/${token}`;
        navigator.clipboard.writeText(url).then(() => {
          this.toast('success', '¡Link copiado!', 'Válido por 48 horas. Envíalo al apoderado.');
        }).catch(() => {
          this.toast('info', 'Link generado', url);
        });
      },
      error: () => this.toast('error', 'Error', 'No se pudo generar el link.')
    });
  }

  toggleBeca(ficha: any) {
    const nuevaBeca = !ficha.beca;
    this.http.put<any>(`${this.apiUrl}/ficha-temporada/${ficha._id}`, { beca: nuevaBeca }, this.authHeaders()).subscribe({
      next: () => {
        ficha.beca = nuevaBeca;
        this.toast('success', 'Beca actualizada', nuevaBeca ? 'Beca activada (sin cobro mensual).' : 'Beca desactivada.');
      },
      error: () => this.toast('error', 'Error', 'No se pudo actualizar la beca.')
    });
  }

  marcarPago(ficha: any, estado: 'pagado' | 'pendiente') {
    this.http.put<any>(`${this.apiUrl}/admin/pago-mensual/${ficha._id}`, { estado }, this.authHeaders()).subscribe({
      next: () => {
        ficha.pagoMesActual = estado;
        this.toast('success', 'Pago actualizado', estado === 'pagado' ? 'Marcado como pagado.' : 'Marcado como pendiente.');
      },
      error: () => this.toast('error', 'Error', 'No se pudo actualizar el pago.')
    });
  }

  /* Jugadores (tab separado) */
  get jugadoresFiltrados() {
    return this.fichas.filter((f: any) => {
      const t = this.filtrosJugadores.texto.trim().toLowerCase();
      if (t) {
        const n = `${f.nombre || ''} ${f.apellidoPaterno || ''} ${f.apellidoMaterno || ''} ${f.apellido || ''}`.toLowerCase();
        const c = (f.cedula || '').toLowerCase();
        const s = (f.sede || '').toLowerCase();
        if (!n.includes(t) && !c.includes(t) && !s.includes(t)) return false;
      }
      if (this.filtrosJugadores.categoria && f.categoria !== this.filtrosJugadores.categoria) return false;
      if (this.filtrosJugadores.posicion && f.posicion !== this.filtrosJugadores.posicion) return false;
      if (this.filtrosJugadores.sede && f.sede !== this.filtrosJugadores.sede) return false;
      return true;
    });
  }

  get posicionJugadorOpciones() {
    const pos = [...new Set(this.fichas.map((f: any) => f.posicion).filter(Boolean))];
    return [{ label: 'Todas', value: null }, ...pos.map(p => ({ label: p as string, value: p as string }))];
  }

  get sedeJugadorOpciones() {
    return [{ label: 'Todas', value: null }, ...this.siteConfig.sedes.map(s => ({ label: s, value: s }))];
  }

  limpiarFiltrosJugadores() { this.filtrosJugadores = { texto: '', categoria: null, posicion: null, sede: null }; }

  verRendimiento(ficha: any) {
    this.fichaSeleccionada = ficha;
    this.cargandoRendimiento = true;
    this.modalRendimientoVisible = true;
    this.rendChartData = null;
    this.rendZoomAnio = null;
    this.rendZoomMes = null;
    this.http.get<any[]>(`${this.apiUrl}/admin/rendimiento/${ficha._id}`, this.authHeaders()).subscribe({
      next: (data) => {
        this.rendimientoJugador = [...data].reverse();
        this.cargandoRendimiento = false;
        this.buildRendChart();
      },
      error: () => { this.rendimientoJugador = []; this.cargandoRendimiento = false; }
    });
  }

  buildRendChart() {
    const data = this.rendimientoJugadorFiltrado;
    if (!data.length) { this.rendChartData = null; return; }
    const labels = data.map(r => {
      const d = new Date(r.fecha);
      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    });
    this.rendChartData = {
      labels,
      datasets: [
        { label: 'Físico',      data: data.map(r => r.fisico?.promedio      ?? 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)', tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Técnico',     data: data.map(r => r.tecnico?.promedio     ?? 0), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)', tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Actitudinal', data: data.map(r => r.actitudinal?.promedio ?? 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Estratégico', data: data.map(r => r.estrategico?.promedio ?? 0), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
      ]
    };
    this.rendChartOptions = {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: 'rgba(233,247,234,.7)', font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { color: 'rgba(233,247,234,.55)', callback: (v: any) => `${v}%` }, grid: { color: 'rgba(57,211,83,.1)' } },
        x: { ticks: { color: 'rgba(233,247,234,.55)' }, grid: { color: 'rgba(57,211,83,.08)' } }
      }
    };
  }

  get rendimientoJugadorFiltrado(): any[] {
    let data = this.rendimientoJugador;
    if (this.rendZoomAnio !== null) {
      data = data.filter(r => new Date(r.fecha).getFullYear() === this.rendZoomAnio);
    }
    if (this.rendZoomMes !== null) {
      data = data.filter(r => new Date(r.fecha).getMonth() === this.rendZoomMes);
    }
    return data;
  }

  get rendAniosDisponibles(): number[] {
    return [...new Set(this.rendimientoJugador.map(r => new Date(r.fecha).getFullYear()))].sort();
  }

  get rendMesesDisponibles(): { label: string; value: number }[] {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const data = this.rendZoomAnio !== null
      ? this.rendimientoJugador.filter(r => new Date(r.fecha).getFullYear() === this.rendZoomAnio)
      : this.rendimientoJugador;
    const nums = [...new Set(data.map(r => new Date(r.fecha).getMonth()))].sort((a,b) => a-b);
    return nums.map(m => ({ label: meses[m], value: m }));
  }

  setRendZoomAnio(anio: number | null) {
    this.rendZoomAnio = anio;
    this.rendZoomMes = null;
    this.buildRendChart();
  }

  setRendZoomMes(mes: number | null) {
    this.rendZoomMes = mes;
    this.buildRendChart();
  }

  get promedioRendimiento() {
    const r = this.rendimientoJugador;
    if (!r.length) return null;
    const avg = (k: string) => +(r.reduce((s: number, x: any) => s + (x[k]?.promedio || 0), 0) / r.length).toFixed(1);
    return {
      fisico:      avg('fisico'),
      tecnico:     avg('tecnico'),
      actitudinal: avg('actitudinal'),
      estrategico: avg('estrategico'),
      general:     +((avg('fisico') + avg('tecnico') + avg('actitudinal') + avg('estrategico')) / 4).toFixed(1)
    };
  }

  /* Arqueros */
  get arqueros(): any[] {
    return this.fichas.filter((f: any) => (f.posicion || '').toLowerCase() === 'arquero');
  }

  /* Categorías */
  get categoriaJugadorOpciones() {
    const cats = ['Sub-6','Sub-8','Sub-10','Sub-12','Sub-14','Sub-16','Sub-18','Libre'];
    return [{ label: 'Todas', value: null }, ...cats.map(c => ({ label: c, value: c }))];
  }

  /* Libro de asistencia */
  cargarLibroAdmin() {
    this.cargandoLibro = true;
    this.libroError = '';
    let url = `${this.apiUrl}/admin/asistencias/libro?mes=${this.libroMes}`;
    if (this.libroCat)  url += `&categoria=${encodeURIComponent(this.libroCat)}`;
    if (this.libroSede) url += `&sede=${encodeURIComponent(this.libroSede)}`;
    this.http.get<any>(url, this.authHeaders()).subscribe({
      next: (data) => { this.libroFechas = data.fechas; this.libroJugadores = data.jugadores; this.cargandoLibro = false; },
      error: (err) => { this.cargandoLibro = false; this.libroError = err?.error?.mensaje || 'Error al cargar el libro de asistencia.'; }
    });
  }

  formatFechaLibro(iso: string): string {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  estadoLetra(estado: string): string {
    if (estado === 'asistio')     return 'P';
    if (estado === 'ausente')     return 'A';
    if (estado === 'justificado') return 'J';
    return '—';
  }

  contarPresentes(fecha: string): string {
    const p = this.libroJugadores.filter(j => j.registros[fecha] === 'asistio').length;
    return `${p}/${this.libroJugadores.length}`;
  }

  nombreLibro(j: any): string {
    const ap = j.apellido || `${j.apellidoPaterno} ${j.apellidoMaterno}`.trim();
    return ap ? `${ap}, ${j.nombre}` : j.nombre;
  }

  /* Lista unificada de divisiones disponibles (de la colección Divisiones + de profesores) */
  get divisionesDisponibles(): string[] {
    const fromDivisiones = this.divisiones.map((d: any) => d.nombre).filter(Boolean);
    const fromProfesores = this.profesores.flatMap((p: any) => p.divisiones || []);
    const todas = [...new Set([...fromDivisiones, ...fromProfesores])].sort();
    return todas as string[];
  }

  isDivisionSeleccionada(d: string): boolean {
    const lista = this.profesorForm.divisionesTexto.split(',').map(x => x.trim()).filter(Boolean);
    return lista.includes(d);
  }

  toggleDivisionProfesor(d: string) {
    const lista = this.profesorForm.divisionesTexto.split(',').map(x => x.trim()).filter(Boolean);
    const idx = lista.indexOf(d);
    if (idx >= 0) lista.splice(idx, 1);
    else lista.push(d);
    this.profesorForm.divisionesTexto = lista.join(', ');
  }

  /* Edición inline en libro de asistencia */
  editarCeldaLibro(jugador: any, fecha: string) {
    const estadoActual = jugador.registros[fecha] || '';
    const ciclo: Record<string, string> = { '': 'asistio', 'asistio': 'ausente', 'ausente': 'justificado', 'justificado': 'asistio' };
    const nuevoEstado = ciclo[estadoActual] ?? 'asistio';
    jugador.registros[fecha] = nuevoEstado;
    this.apiService.editarAsistenciaAdmin(jugador._id, fecha, nuevoEstado).subscribe({
      next: () => {
        // Recalcular porcentaje del jugador
        const totalClases = this.libroFechas.length;
        const asistio     = this.libroFechas.filter(f => jugador.registros[f] === 'asistio').length;
        const justificado = this.libroFechas.filter(f => jugador.registros[f] === 'justificado').length;
        jugador.asistio     = asistio;
        jugador.justificado = justificado;
        jugador.ausente     = this.libroFechas.filter(f => jugador.registros[f] === 'ausente').length;
        jugador.porcentaje  = totalClases > 0 ? Math.round((asistio + justificado) / totalClases * 100) : null;
      },
      error: () => {
        jugador.registros[fecha] = estadoActual;
        this.toast('error', 'Error', 'No se pudo guardar el cambio.');
      }
    });
  }

  /* Profesores */
  get divisionProfesorOpciones() {
    const divs = [...new Set(this.profesores.flatMap((p: any) => p.divisiones || []))];
    return [{ label: 'Todas', value: null }, ...divs.map(d => ({ label: d as string, value: d as string }))];
  }
  get profesoresFiltrados() {
    return this.profesores.filter((p: any) => {
      const t = this.filtrosProfesores.texto.trim().toLowerCase();
      if (t) {
        const n = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase();
        const e = (p.especialidad || '').toLowerCase();
        if (!n.includes(t) && !e.includes(t)) return false;
      }
      if (this.filtrosProfesores.division && !(p.divisiones || []).includes(this.filtrosProfesores.division)) return false;
      return true;
    });
  }
  limpiarFiltrosProfesores() { this.filtrosProfesores = { texto: '', division: null }; }

  /* Cuenta cuántas fichas tienen una categoría que coincide con el nombre de la división */
  contarJugadoresDivision(division: any): number {
    if (!this.fichas.length) return division.estudiantes || 0;
    const nombre = (division.nombre || '').toLowerCase().trim();
    return this.fichas.filter((f: any) =>
      (f.categoria || '').toLowerCase().trim() === nombre
    ).length;
  }

  /* Divisiones */
  get divisionesFiltradas() {
    const t = this.filtrosDivisiones.texto.trim().toLowerCase();
    if (!t) return this.divisiones;
    return this.divisiones.filter(d =>
      (d.nombre || '').toLowerCase().includes(t) ||
      (d.categoria || '').toLowerCase().includes(t) ||
      (d.profesorPrincipal || '').toLowerCase().includes(t)
    );
  }
  limpiarFiltrosDivisiones() { this.filtrosDivisiones = { texto: '' }; }

  /* Partidos */
  get tipoPartidoFiltroOpciones() {
    return [
      { label: 'Todos', value: null },
      { label: 'Próximo partido', value: 'proximo' },
      { label: 'Resultado', value: 'resultado' },
    ];
  }
  get partidosFiltrados() {
    return this.partidos.filter((p: any) => {
      const t = this.filtrosPartidos.texto.trim().toLowerCase();
      if (t) {
        const l = (p.local || '').toLowerCase();
        const v = (p.visitante || '').toLowerCase();
        if (!l.includes(t) && !v.includes(t)) return false;
      }
      if (this.filtrosPartidos.tipo && p.tipo !== this.filtrosPartidos.tipo) return false;
      return true;
    });
  }
  limpiarFiltrosPartidos() { this.filtrosPartidos = { texto: '', tipo: null }; }

  getEstadoSeverity(estado: string): 'warn' | 'success' | 'danger' | 'secondary' {
    if (estado === 'aprobado') return 'success';
    if (estado === 'rechazado') return 'danger';
    return 'warn';
  }

  volverInicio(): void { this.router.navigate(['/inicio']); }
}
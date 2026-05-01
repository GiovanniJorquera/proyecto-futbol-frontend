import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';
import { EstadoPago, Pago } from '../models/pago';
import { PagosService } from '../services/pagos.service';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, CurrencyPipe, FormsModule, TableModule, ButtonModule, CardModule, DialogModule, TagModule, InputTextModule, SelectModule, ConfirmDialogModule, ToastModule],
  providers: [ConfirmationService, MessageService],
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

  /* ── ESTUDIANTES ──────────────────────────────── */
  estudiantes: any[] = [];
  estudianteForm = { nombre: '', rut: '', division: '', fechaIngreso: '', telefono: '', email: '' };
  estudianteEditando: any = null;
  modalEstudianteVisible = false;

  /* ── PROFESORES ───────────────────────────────── */
  profesores: any[] = [];
  profesorForm = { nombre: '', especialidad: '', experiencia: '', divisionesTexto: '', telefono: '', email: '' };
  profesorEditando: any = null;
  modalProfesorVisible = false;

  /* ── DIVISIONES ───────────────────────────────── */
  divisiones: any[] = [];
  divisionForm = { nombre: '', categoria: '', profesorPrincipal: '', estudiantes: 0 };
  divisionEditando: any = null;
  modalDivisionVisible = false;

  /* ── PAGOS ────────────────────────────────────── */
  pagosPendientes: Pago[] = [];
  // (cargarPartidos and partido CRUD methods are after PAGOS section)
  pagoSeleccionado: Pago | null = null;
  modalVoucherVisible = false;
  cargandoPagos = false;
  usandoEjemplos = false;

  private readonly pagosEjemplo: Pago[] = [
    { id: 'pago-ejemplo-1', apoderado: 'Camila Rojas', alumno: 'Nicolás Rojas (12.345.678-9)', sede: 'Sede 1', monto: 25000, fecha: '2026-04-18', voucherBase64: '/media/comprobantetransbankboleta.webp', estado: 'pendiente' },
    { id: 'pago-ejemplo-2', apoderado: 'Francisco Díaz', alumno: 'Tomás Díaz (13.456.789-0)', sede: 'Sede 2', monto: 30000, fecha: '2026-04-20', voucherBase64: '/media/comprobantetransbankboleta.webp', estado: 'pendiente' },
    { id: 'pago-ejemplo-3', apoderado: 'Andrea Muñoz', alumno: 'Martina Muñoz (14.567.890-1)', sede: 'Sede 1', monto: 28000, fecha: '2026-04-22', voucherBase64: '/media/comprobantetransbankboleta.webp', estado: 'pendiente' },
  ];

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
  };
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

  constructor(
    private apiService: ApiService,
    private router: Router,
    private pagosService: PagosService,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    this.cargarSolicitudes();
    this.cargarEstudiantes();
    this.cargarProfesores();
    this.cargarDivisiones();
    this.cargarPartidos();
    this.cargarPendientes();
    this.cargarConfig();
    this.cargarNoticiasAdmin();
  }

  private toast(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }

  private confirmar(msg: string, header: string, icon: string, acceptLabel: string, acceptClass: string, onAccept: () => void) {
    this.confirmationService.confirm({ message: msg, header, icon, acceptLabel, rejectLabel: 'Cancelar', acceptButtonStyleClass: acceptClass, accept: onAccept });
  }

  /* ── SOLICITUDES ──────────────────────────────── */
  cargarSolicitudes() {
    this.cargando = true;
    this.apiService.getInscripciones().subscribe({
      next: (data) => { this.solicitudes = data; this.cargando = false; },
      error: () => { this.toast('error', 'Error', 'No se pudieron cargar las solicitudes.'); this.cargando = false; }
    });
  }

  aprobar(id: string) {
    this.confirmar('¿Estás seguro de <strong>aprobar</strong> a este jugador?', 'Aprobar inscripción', 'pi pi-check-circle', 'Sí, aprobar', 'p-button-success', () => {
      this.apiService.aprobarInscripcion(id).subscribe({
        next: () => { this.toast('success', 'Aprobado', 'El jugador fue aprobado.'); this.modalSolicitudVisible = false; this.cargarSolicitudes(); },
        error: () => this.toast('error', 'Error', 'No se pudo aprobar al jugador.')
      });
    });
  }

  rechazar(id: string) {
    this.confirmar('¿Estás seguro de <strong>rechazar</strong> a este jugador?', 'Rechazar inscripción', 'pi pi-exclamation-triangle', 'Sí, rechazar', 'p-button-danger', () => {
      this.apiService.rechazarInscripcion(id).subscribe({
        next: () => { this.toast('warn', 'Rechazado', 'El jugador fue rechazado.'); this.modalSolicitudVisible = false; this.cargarSolicitudes(); },
        error: () => this.toast('error', 'Error', 'No se pudo rechazar al jugador.')
      });
    });
  }

  verDetalle(solicitud: any) { this.solicitudSeleccionada = solicitud; this.modalSolicitudVisible = true; }

  /* ── ESTUDIANTES ──────────────────────────────── */
  cargarEstudiantes() {
    this.apiService.getEstudiantes().subscribe({
      next: (data) => this.estudiantes = data,
      error: () => {}
    });
  }

  abrirModalEstudiante(e?: any) {
    this.estudianteEditando = e || null;
    this.estudianteForm = e
      ? { nombre: e.nombre, rut: e.rut, division: e.division, fechaIngreso: e.fechaIngreso, telefono: e.telefono, email: e.email }
      : { nombre: '', rut: '', division: '', fechaIngreso: '', telefono: '', email: '' };
    this.modalEstudianteVisible = true;
  }

  guardarEstudiante() {
    if (!this.estudianteForm.nombre) { this.toast('warn', 'Campo requerido', 'El nombre es obligatorio.'); return; }
    const req = this.estudianteEditando
      ? this.apiService.saveEstudiante(this.estudianteForm, this.estudianteEditando._id)
      : this.apiService.saveEstudiante(this.estudianteForm);
    req.subscribe({
      next: () => { this.modalEstudianteVisible = false; this.toast('success', 'Guardado', `Estudiante ${this.estudianteEditando ? 'actualizado' : 'agregado'}.`); this.cargarEstudiantes(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar el estudiante.')
    });
  }

  eliminarEstudiante(id: string) {
    this.confirmar('¿Eliminar este estudiante?', 'Eliminar estudiante', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.apiService.deleteEstudiante(id).subscribe({
        next: () => { this.toast('success', 'Eliminado', 'Estudiante eliminado.'); this.cargarEstudiantes(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── PROFESORES ───────────────────────────────── */
  cargarProfesores() {
    this.apiService.getProfesores().subscribe({
      next: (data) => this.profesores = data,
      error: () => {}
    });
  }

  abrirModalProfesor(p?: any) {
    this.profesorEditando = p || null;
    this.profesorForm = p
      ? { nombre: p.nombre, especialidad: p.especialidad, experiencia: p.experiencia, divisionesTexto: (p.divisiones || []).join(', '), telefono: p.telefono, email: p.email }
      : { nombre: '', especialidad: '', experiencia: '', divisionesTexto: '', telefono: '', email: '' };
    this.modalProfesorVisible = true;
  }

  guardarProfesor() {
    if (!this.profesorForm.nombre) { this.toast('warn', 'Campo requerido', 'El nombre es obligatorio.'); return; }
    const data = { ...this.profesorForm, divisiones: this.profesorForm.divisionesTexto.split(',').map(d => d.trim()).filter(Boolean) };
    const req = this.profesorEditando
      ? this.apiService.saveProfesor(data, this.profesorEditando._id)
      : this.apiService.saveProfesor(data);
    req.subscribe({
      next: () => { this.modalProfesorVisible = false; this.toast('success', 'Guardado', `Profesor ${this.profesorEditando ? 'actualizado' : 'agregado'}.`); this.cargarProfesores(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar el profesor.')
    });
  }

  eliminarProfesor(id: string) {
    this.confirmar('¿Eliminar este profesor?', 'Eliminar profesor', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.apiService.deleteProfesor(id).subscribe({
        next: () => { this.toast('success', 'Eliminado', 'Profesor eliminado.'); this.cargarProfesores(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── DIVISIONES ───────────────────────────────── */
  cargarDivisiones() {
    this.apiService.getDivisiones().subscribe({
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
      ? this.apiService.saveDivision(this.divisionForm, this.divisionEditando._id)
      : this.apiService.saveDivision(this.divisionForm);
    req.subscribe({
      next: () => { this.modalDivisionVisible = false; this.toast('success', 'Guardado', `División ${this.divisionEditando ? 'actualizada' : 'agregada'}.`); this.cargarDivisiones(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar la división.')
    });
  }

  eliminarDivision(id: string) {
    this.confirmar('¿Eliminar esta división?', 'Eliminar división', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.apiService.deleteDivision(id).subscribe({
        next: () => { this.toast('success', 'Eliminada', 'División eliminada.'); this.cargarDivisiones(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── PARTIDOS ─────────────────────────────────── */
  cargarPartidos() {
    this.apiService.getPartidos().subscribe({
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
      ? this.apiService.savePartido(this.partidoForm, this.partidoEditando._id)
      : this.apiService.savePartido(this.partidoForm);
    req.subscribe({
      next: () => { this.modalPartidoVisible = false; this.toast('success', 'Guardado', `Partido ${this.partidoEditando ? 'actualizado' : 'agregado'}.`); this.cargarPartidos(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar el partido.')
    });
  }

  eliminarPartido(id: string) {
    this.confirmar('¿Eliminar este partido?', 'Eliminar partido', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.apiService.deletePartido(id).subscribe({
        next: () => { this.toast('success', 'Eliminado', 'Partido eliminado.'); this.cargarPartidos(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar.')
      });
    });
  }

  /* ── PAGOS ────────────────────────────────────── */
  cargarPendientes(): void {
    this.pagosPendientes = [...this.pagosEjemplo];
    this.usandoEjemplos = true;
    this.cargandoPagos = false;
    this.pagosService.getPagosPendientes().pipe(timeout(3000), catchError(() => of([] as Pago[]))).subscribe((pagos) => {
      const filtrados = pagos.filter(p => p.estado === 'pendiente');
      if (filtrados.length > 0) { this.pagosPendientes = filtrados; this.usandoEjemplos = false; }
    });
  }

  verVoucher(pago: Pago): void {
    if (pago.voucherBase64) {
      this.pagoSeleccionado = pago;
      this.modalVoucherVisible = true;
    } else {
      this.apiService.getPago(pago.id).subscribe({
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
          },
          error: () => this.toast('error', 'Error', 'No se pudo actualizar el pago.')
        });
      }
    );
  }

  /* ── CONFIG / NOTICIAS ────────────────────────── */
  cargarConfig(): void {
    this.apiService.getConfig().subscribe({
      next: (c) => {
        this.siteConfig.tituloHeader = c.tituloHeader || 'Escuela de Futbol - Inicio';
        this.siteConfig.tituloBienvenida = c.tituloBienvenida || '¡Bienvenidos Crack!';
        this.siteConfig.subtituloBienvenida = c.subtituloBienvenida || 'Revisa las últimas novedades de tu club.';
        this.siteConfig.imagenDestacada = c.imagenDestacada || '';
        this.siteConfig.imagenesCarrusel = c.imagenesCarrusel || [];
        this.siteConfig.imagenesGaleria = c.imagenesGaleria || [];
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
    const b64 = await this.comprimirImagen(file, 1600, 0.80);
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
    const b64 = await this.comprimirImagen(file, 1400, 0.78);
    this.siteConfig.imagenesGaleria = [...this.siteConfig.imagenesGaleria, { url: b64, descripcion: '' }];
    input.value = '';
  }

  eliminarImagenGaleria(i: number) {
    this.siteConfig.imagenesGaleria = this.siteConfig.imagenesGaleria.filter((_, idx) => idx !== i);
  }

  seleccionarImagenDestacada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        this.siteConfig.imagenDestacada = canvas.toDataURL('image/jpeg', 0.82);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  guardarConfig(): void {
    this.guardandoConfig = true;
    this.apiService.updateConfig(this.siteConfig).subscribe({
      next: () => { this.guardandoConfig = false; this.toast('success', 'Guardado', 'Configuración actualizada.'); },
      error: () => { this.guardandoConfig = false; this.toast('error', 'Error', 'No se pudo guardar la configuración.'); },
    });
  }

  cargarNoticiasAdmin(): void {
    this.apiService.getNoticias().subscribe({ next: (d) => this.noticiasAdmin = d, error: () => {} });
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
      ? this.apiService.saveNoticia(this.noticiaForm, this.noticiaEditando._id)
      : this.apiService.saveNoticia(this.noticiaForm);
    req.subscribe({
      next: () => { this.modalNoticiaVisible = false; this.toast('success', 'Guardado', `Noticia ${this.noticiaEditando ? 'actualizada' : 'creada'}.`); this.cargarNoticiasAdmin(); },
      error: () => this.toast('error', 'Error', 'No se pudo guardar la noticia.'),
    });
  }

  eliminarNoticia(id: string): void {
    this.confirmar('¿Eliminar esta noticia? Esta acción no se puede deshacer.', 'Eliminar noticia', 'pi pi-trash', 'Sí, eliminar', 'p-button-danger', () => {
      this.apiService.deleteNoticia(id).subscribe({
        next: () => { this.toast('success', 'Eliminada', 'Noticia eliminada.'); this.cargarNoticiasAdmin(); },
        error: () => this.toast('error', 'Error', 'No se pudo eliminar la noticia.'),
      });
    });
  }

  /* ── HELPERS ──────────────────────────────────── */
  setActiveTab(tab: string) { this.activeTab = tab; }

  getEstadoSeverity(estado: string): 'warn' | 'success' | 'danger' | 'secondary' {
    if (estado === 'aprobado') return 'success';
    if (estado === 'rechazado') return 'danger';
    return 'warn';
  }

  volverInicio(): void { this.router.navigate(['/inicio']); }
}

import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PagosService } from '../../services/pagos.service';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-vista-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule],
  templateUrl: './vista-cliente.html',
  styleUrl: './vista-cliente.css'
})
export class VistaClienteComponent implements OnInit {
  @HostBinding('class.dark') temaOscuro = false;
  menuAbierto = false;

  ficha: any = null;
  cargando = true;
  error = '';
  usuario: any = null;

  pagosMensuales: any = null;
  pagosMensualesError = false;
  rendimiento: any = null;

  chartData: any = null;
  chartOptions: any = null;

  mostrarFormVoucher = false;
  voucherSedes = [{ label: 'Sede 1', value: 'Sede 1' }, { label: 'Sede 2', value: 'Sede 2' }];
  voucherForm = { sede: '', montoPagado: 20000, fecha: '', voucherBase64: '' };
  voucherPreview = '';
  enviandoVoucher = false;
  mensajeVoucher = '';
  tipoMensajeVoucher: 'ok' | 'error' | '' = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private pagosService: PagosService
  ) {}

  ngOnInit() {
    this.usuario = this.auth.getUsuario();
    const tema = localStorage.getItem('tema');
    this.temaOscuro = tema === 'dark';
    this.cargarFicha();
    this.api.getMisPagosMensuales().subscribe({
      next: (data) => {
        this.pagosMensuales = {
          mesActual: { mes: data.mesActual.mes, anio: data.mesActual['año'], estado: data.mesActual.estado, monto: data.mesActual.monto },
          historial: (data.historial || []).map((p: any) => ({ mes: p.mes, anio: p['año'], estado: p.estado }))
        };
      },
      error: () => { this.pagosMensualesError = true; this.pagosMensuales = { error: true }; }
    });
    this.api.getMiRendimiento().subscribe({
      next: (data) => {
        this.rendimiento = data;
        this.buildChart(data);
      }
    });
  }

  buildChart(data: any) {
    if (!data?.historial?.length) return;
    const hist = data.historial;
    const labels = hist.map((h: any) => {
      const d = new Date(h.fecha);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    });
    const textColor = this.temaOscuro ? 'rgba(244,247,243,.7)' : 'rgba(20,50,20,.6)';
    const gridColor = this.temaOscuro ? 'rgba(57,211,83,.1)' : 'rgba(30,122,48,.1)';

    this.chartData = {
      labels,
      datasets: [
        { label: 'Físico',      data: hist.map((h: any) => h.fisico),      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Técnico',     data: hist.map((h: any) => h.tecnico),     borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)', tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Actitudinal', data: hist.map((h: any) => h.actitudinal), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Estratégico', data: hist.map((h: any) => h.estrategico), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: textColor, font: { size: 13 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: (v: any) => `${v}%` },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    };
  }

  cargarFicha() {
    this.api.getMiFicha().subscribe({
      next: (data) => { this.ficha = data; this.cargando = false; },
      error: () => { this.error = 'No se encontró información asociada a tu cuenta.'; this.cargando = false; }
    });
  }

  onVoucherFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        this.voucherPreview = compressed;
        this.voucherForm.voucherBase64 = compressed;
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  enviarVoucher(): void {
    if (!this.ficha || !this.voucherForm.sede || !this.voucherForm.fecha || !this.voucherForm.voucherBase64) {
      this.tipoMensajeVoucher = 'error';
      this.mensajeVoucher = 'Por favor completa todos los campos y sube el comprobante.';
      return;
    }
    this.enviandoVoucher = true;
    this.mensajeVoucher = '';
    this.pagosService.postPago({
      apoderado: this.ficha.apoderado?.nombre || 'Apoderado',
      alumno: `${this.ficha.nombre} (${this.ficha.cedula || 'sin RUT'})`,
      sede: this.voucherForm.sede as 'Sede 1' | 'Sede 2',
      monto: this.voucherForm.montoPagado,
      fecha: this.voucherForm.fecha,
      voucherBase64: this.voucherForm.voucherBase64,
      fichaId: this.ficha._id,
    }).subscribe({
      next: () => {
        this.enviandoVoucher = false;
        this.tipoMensajeVoucher = 'ok';
        this.mensajeVoucher = 'Voucher enviado. El administrador revisará tu pago.';
        this.mostrarFormVoucher = false;
        this.voucherForm = { sede: '', montoPagado: 20000, fecha: '', voucherBase64: '' };
        this.voucherPreview = '';
      },
      error: () => {
        this.enviandoVoucher = false;
        this.tipoMensajeVoucher = 'error';
        this.mensajeVoucher = 'No se pudo enviar el voucher. Intenta nuevamente.';
      }
    });
  }

  get estadoPago(): 'exento' | 'pagado' | 'pendiente' {
    if (this.ficha?.beca) return 'exento';
    if (this.pagosMensuales?.mesActual?.estado === 'pagado') return 'pagado';
    return 'pendiente';
  }

  get mesesNombres(): string[] {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  }

  promedioBarWidth(valor: number): string {
    return `${valor}%`;
  }

  toggleTema() {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('tema', this.temaOscuro ? 'dark' : 'light');
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/inicio']);
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
}

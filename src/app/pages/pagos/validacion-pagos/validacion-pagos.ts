import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { catchError, of, timeout } from 'rxjs';
import { EstadoPago, Pago } from '../../../models/pago';
import { PagosService } from '../../../services/pagos.service';

@Component({
  selector: 'app-validacion-pagos',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, DialogModule],
  templateUrl: './validacion-pagos.html',
  styleUrl: './validacion-pagos.css',
})
export class ValidacionPagosComponent implements OnInit {
  pagosPendientes: Pago[] = [];
  pagoSeleccionado: Pago | null = null;
  modalVoucherVisible = false;
  cargando = false;
  usandoEjemplos = false;

  private readonly pagosEjemplo: Pago[] = [
    {
      id: 'pago-ejemplo-1',
      apoderado: 'Camila Rojas',
      alumno: 'Nicolás Rojas (12.345.678-9)',
      sede: 'Sede 1',
      monto: 25000,
      fecha: '2026-04-18',
      voucherBase64: '/media/comprobantetransbankboleta.webp',
      estado: 'pendiente',
    },
    {
      id: 'pago-ejemplo-2',
      apoderado: 'Francisco Díaz',
      alumno: 'Tomás Díaz (13.456.789-0)',
      sede: 'Sede 2',
      monto: 30000,
      fecha: '2026-04-20',
      voucherBase64: '/media/comprobantetransbankboleta.webp',
      estado: 'pendiente',
    },
    {
      id: 'pago-ejemplo-3',
      apoderado: 'Andrea Muñoz',
      alumno: 'Martina Muñoz (14.567.890-1)',
      sede: 'Sede 1',
      monto: 28000,
      fecha: '2026-04-22',
      voucherBase64: '/media/comprobantetransbankboleta.webp',
      estado: 'pendiente',
    },
  ];

  constructor(private readonly pagosService: PagosService) {}

  ngOnInit(): void {
    this.cargarPendientes();
  }

  cargarPendientes(): void {
    this.pagosPendientes = [...this.pagosEjemplo];
    this.usandoEjemplos = true;
    this.cargando = false;

    this.pagosService
      .getPagosPendientes()
      .pipe(
        timeout(3000),
        catchError(() => of([] as Pago[]))
      )
      .subscribe((pagos) => {
        const pagosFiltrados = pagos.filter((pago) => pago.estado === 'pendiente');

        if (pagosFiltrados.length > 0) {
          this.pagosPendientes = pagosFiltrados;
          this.usandoEjemplos = false;
        }
      });
  }

  verVoucher(pago: Pago): void {
    this.pagoSeleccionado = pago;
    this.modalVoucherVisible = true;
  }

  cambiarEstado(pago: Pago, estado: EstadoPago): void {
    this.pagosService.updateEstadoPago(pago.id, estado).subscribe({
      next: () => {
        this.pagosPendientes = this.pagosPendientes.filter((item) => item.id !== pago.id);
        if (this.pagoSeleccionado?.id === pago.id) {
          this.modalVoucherVisible = false;
          this.pagoSeleccionado = null;
        }
      },
    });
  }
}

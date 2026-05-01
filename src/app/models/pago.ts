export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado';

export interface Pago {
  id: string;
  apoderado: string;
  alumno: string;
  sede: 'Sede 1' | 'Sede 2';
  monto: number;
  fecha: string;
  voucherBase64: string;
  estado: EstadoPago;
}

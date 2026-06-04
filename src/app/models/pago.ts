export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado';

export interface Pago {
  id: string;
  apoderado: string;
  alumno: string;
  sede: string;
  monto: number;
  fecha: string;
  voucherBase64: string;
  estado: EstadoPago;
}

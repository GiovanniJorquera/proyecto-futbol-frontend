import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PagosService } from '../../../services/pagos.service';

interface SedeOption {
  label: string;
  value: 'Sede 1' | 'Sede 2';
}

@Component({
  selector: 'app-registro-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, SelectModule, ButtonModule],
  templateUrl: './registro-pago.html',
  styleUrl: './registro-pago.css',
})
export class RegistroPagoComponent {
  readonly sedes: SedeOption[] = [
    { label: 'Sede 1', value: 'Sede 1' },
    { label: 'Sede 2', value: 'Sede 2' },
  ];

  voucherPreview = '';
  enviando = false;
  mensaje = '';
  tipoMensaje: 'ok' | 'error' | '' = '';

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly pagosService: PagosService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      nombreAlumno: ['', Validators.required],
      rutAlumno: ['', Validators.required],
      montoPagado: [null as number | null, [Validators.required, Validators.min(1)]],
      fecha: ['', Validators.required],
      sede: [null as 'Sede 1' | 'Sede 2' | null, Validators.required],
      voucherBase64: ['', Validators.required],
    });
  }

  onFileSelected(event: Event): void {
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
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        this.voucherPreview = compressed;
        this.form.patchValue({ voucherBase64: compressed });
        this.form.get('voucherBase64')?.markAsDirty();
        this.form.get('voucherBase64')?.updateValueAndValidity();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  guardarPago(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.enviando = true;
    this.mensaje = '';

    this.pagosService
      .postPago({
        apoderado: 'Apoderado no informado',
        alumno: `${value.nombreAlumno} (${value.rutAlumno})`,
        sede: value.sede as 'Sede 1' | 'Sede 2',
        monto: value.montoPagado as number,
        fecha: value.fecha as string,
        voucherBase64: value.voucherBase64 as string,
      })
      .subscribe({
        next: () => {
          this.enviando = false;
          this.tipoMensaje = 'ok';
          this.mensaje = 'Pago registrado correctamente y enviado a validacion.';
          this.form.reset();
          this.voucherPreview = '';
        },
        error: () => {
          this.enviando = false;
          this.tipoMensaje = 'error';
          this.mensaje = 'No se pudo registrar el pago. Intenta nuevamente.';
        },
      });
  }

  campoInvalido(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  volverInicio(): void { this.router.navigate(['/inicio']); }
  navegarFormulario(): void { this.router.navigate(['/formulario']); }
  navegarLogin(): void { this.router.navigate(['/login']); }
}

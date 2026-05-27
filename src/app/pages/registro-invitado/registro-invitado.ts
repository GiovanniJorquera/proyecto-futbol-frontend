import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-registro-invitado',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, SelectModule, ButtonModule, ToastModule],
  templateUrl: './registro-invitado.html',
  styleUrl: './registro-invitado.css'
})
export class RegistroInvitadoComponent implements OnInit {
  token = '';
  estado: 'cargando' | 'valido' | 'invalido' | 'expirado' | 'usado' | 'enviado' = 'cargando';
  mensajeError = '';
  esTimeout = false;
  mensajeCarga = 'Validando link...';
  private intentos = 0;
  formulario!: FormGroup;
  rutInvalido = false;
  enviando = false;
  categoriaSugerida = '';
  ramaFemenina = false;

  sedesOpciones: string[] = ['Viña del Mar', 'Olmué'];
  generos = [{ name: 'Masculino' }, { name: 'Femenino' }];
  comunas = [
    { name: 'Viña del Mar' }, { name: 'Valparaíso' }, { name: 'Quilpué' },
    { name: 'Villa Alemana' }, { name: 'Concón' }, { name: 'Quintero' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.formulario = this.fb.group({
      apoderado: this.fb.group({
        nombre:    ['', [Validators.required, Validators.maxLength(80)]],
        apellidos: ['', [Validators.required, Validators.maxLength(80)]],
        correo:    ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        telefono:  ['', [Validators.required, Validators.pattern(/^\+?56?\s?9\s?\d{4}\s?\d{4}$/), Validators.maxLength(20)]]
      }),
      pupilo: this.fb.group({
        nombre:          ['', [Validators.required, Validators.maxLength(80)]],
        apellidoPaterno: ['', [Validators.required, Validators.maxLength(80)]],
        apellidoMaterno: ['', [Validators.required, Validators.maxLength(80)]],
        rut:             ['', [Validators.required, Validators.maxLength(15), this.validarRut.bind(this)]],
        fechaNacimiento: ['', Validators.required],
        genero:          [null, Validators.required],
        direccion:       ['', [Validators.required, Validators.maxLength(150)]],
        comuna:          [null, Validators.required],
        sede:            ['', Validators.required]
      })
    });

    this.formulario.get('pupilo.rut')?.valueChanges.subscribe(v => {
      this.rutInvalido = !this.validarRutFormato(v);
    });

    this.api.getConfig().subscribe({
      next: (c) => { if (c.sedes?.length) this.sedesOpciones = c.sedes; },
      error: () => {}
    });

    if (!this.token) {
      this.estado = 'invalido';
      this.mensajeError = 'Link inválido.';
      return;
    }

    this.validarToken();
    this.registrarObservadoresCategoria();
  }

  private registrarObservadoresCategoria(): void {
    this.formulario.get('pupilo.fechaNacimiento')?.valueChanges.subscribe(() => this.actualizarCategoriaSugerida());
    this.formulario.get('pupilo.genero')?.valueChanges.subscribe(() => this.actualizarCategoriaSugerida());
  }

  private actualizarCategoriaSugerida(): void {
    const fechaNacimiento = this.formulario.get('pupilo.fechaNacimiento')?.value;
    const genero = this.formulario.get('pupilo.genero')?.value;
    const edad = this.calcularEdad(fechaNacimiento);
    this.categoriaSugerida = edad >= 0 ? this.obtenerCategoriaPorEdad(edad) : '';
    this.ramaFemenina = genero?.name === 'Femenino';
  }

  private calcularEdad(fecha: string | null): number {
    if (!fecha) return -1;
    const nacimiento = new Date(fecha);
    if (isNaN(nacimiento.getTime())) return -1;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }

  private obtenerCategoriaPorEdad(edad: number): string {
    if (edad <= 6) return 'Sub-6';
    if (edad <= 8) return 'Sub-8';
    if (edad <= 10) return 'Sub-10';
    if (edad <= 12) return 'Sub-12';
    if (edad <= 14) return 'Sub-14';
    if (edad <= 16) return 'Sub-16';
    if (edad <= 18) return 'Sub-18';
    return 'Libre';
  }

  reintentar() {
    this.estado = 'cargando';
    this.mensajeError = '';
    this.esTimeout = false;
    this.intentos = 0;
    this.mensajeCarga = 'Validando link...';
    this.validarToken();
  }

  private validarToken() {
    this.intentos++;
    this.api.validarInvitacion(this.token).pipe(timeout(40000)).subscribe({
      next: () => { this.estado = 'valido'; },
      error: (err) => {
        if (err?.name === 'TimeoutError') {
          if (this.intentos < 2) {
            this.mensajeCarga = 'El servidor está iniciando, reintentando...';
            setTimeout(() => this.validarToken(), 3000);
            return;
          }
          this.estado = 'invalido'; this.esTimeout = true;
          this.mensajeError = 'El servidor tardó en responder. Intenta nuevamente.';
          return;
        }
        this.esTimeout = false;
        const msg: string = err?.error?.mensaje ?? '';
        if (msg.includes('utilizado')) { this.estado = 'usado'; }
        else if (msg.includes('expirado')) { this.estado = 'expirado'; }
        else { this.estado = 'invalido'; }
        this.mensajeError = msg || 'Link no válido.';
      }
    });
  }

  validarRut(control: AbstractControl): ValidationErrors | null {
    return this.validarRutFormato(control.value) ? null : { rutInvalido: true };
  }

  validarRutFormato(rut: string): boolean {
    if (!rut) return false;
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    if (rut.length < 8 || rut.length > 9) return false;
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    let suma = 0, mult = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    const resto = suma % 11;
    const dvCalc = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    return dv === dvCalc;
  }

  campoInvalido(grupo: string, campo: string): boolean {
    const c = this.formulario.get(`${grupo}.${campo}`);
    return !!(c?.invalid && c?.touched);
  }

  enviarFormulario() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario incompleto', detail: 'Completa todos los campos requeridos.', life: 4000 });
      return;
    }
    this.enviando = true;
    const payload = { ...this.formulario.value, invitacionToken: this.token };
    this.api.crearFichaTemporada(payload).subscribe({
      next: () => {
        this.enviando = false;
        this.estado = 'enviado';
      },
      error: (err) => {
        this.enviando = false;
        const msg: string = err?.error?.mensaje ?? '';
        if (msg.includes('utilizado') || msg.includes('expirado')) {
          this.estado = 'usado';
          this.mensajeError = msg;
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error al enviar', detail: 'Intenta nuevamente.', life: 5000 });
        }
      }
    });
  }
}

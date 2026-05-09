import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ApiService } from '../services/api.service';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-ficha-temporada',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './ficha-temporada.html',
  styleUrls: ['./ficha-temporada.css']
})
export class FichaTemporadaComponent {

  formulario!: FormGroup;
  enviando = false;

  posiciones = [
    { name: 'Arquero' },
    { name: 'Defensa' },
    { name: 'Mediocampista' },
    { name: 'Delantero' }
  ];

  pies = [
    { name: 'Derecho' },
    { name: 'Izquierdo' },
    { name: 'Ambidiestro' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private messageService: MessageService
  ) {
    this.formulario = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      ciudad: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      cedula: ['', Validators.required],

      establecimiento: [''],
      curso: [''],
      clubAmateur: [''],
      talla: [''],
      numerosFavoritos: [''],
      nombreCamiseta: [''],

      posicion: [null],
      pieHabil: [null],

      aniosJugando: [''],
      otrosDeportes: [''],
      otrasEscuelas: [''],
      actitudSocial: [''],
      actitudAdversidad: [''],

      apoderado: this.fb.group({
        nombre: ['', Validators.required],
        direccion: [''],
        ciudad: [''],
        rut: [''],
        correo: ['', [Validators.required, Validators.email]],
        telefonoCasa: [''],
        whatsapp: [''],
        vinculo: ['']
      })
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control?.invalid && control?.touched);
  }

  campoApoderadoInvalido(campo: string): boolean {
    const control = this.formulario.get(`apoderado.${campo}`);
    return !!(control?.invalid && control?.touched);
  }

  enviarFormulario() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();

      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Completa los campos obligatorios.',
        life: 4000
      });

      return;
    }

    this.enviando = true;

    const payload = {
      ...this.formulario.value,
      posicion: this.formulario.value.posicion?.name || '',
      pieHabil: this.formulario.value.pieHabil?.name || ''
    };

    this.apiService.crearFichaTemporada(payload).subscribe({
      next: () => {
        this.enviando = false;

        this.messageService.add({
          severity: 'success',
          summary: 'Ficha registrada',
          detail: 'Jugador incorporado correctamente.',
          life: 3000
        });

        this.formulario.reset();

        setTimeout(() => this.router.navigate(['/inicio']), 2000);
      },

      error: () => {
        this.enviando = false;

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la ficha.',
          life: 4000
        });
      }
    });
  }

  volverInicio() {
    this.router.navigate(['/inicio']);
  }
}
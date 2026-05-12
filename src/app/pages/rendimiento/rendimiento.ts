import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { RendimientoService } from '../../services/rendimiento.service';

@Component({
  selector: 'app-rendimiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    ButtonModule
  ],
  templateUrl: './rendimiento.html',
  styleUrls: ['./rendimiento.css']
})
export class RendimientoComponent implements OnInit {

  formulario!: FormGroup;

  rendimientos: any[] = [];

  resumen: any = {};

  jugadorId = '';

  profesorId = '';

  constructor(
    private fb: FormBuilder,
    private rendimientoService: RendimientoService
  ) {}

  ngOnInit(): void {

    this.formulario = this.fb.group({
      velocidad: [5, Validators.required],
      resistencia: [5, Validators.required],
      tecnica: [5, Validators.required],
      disciplina: [5, Validators.required],
      comentario: ['']
    });

  }

  guardarRendimiento() {

    const data = {
      jugadorId: this.jugadorId,
      profesorId: this.profesorId,
      ...this.formulario.value
    };

    this.rendimientoService.crearRendimiento(data)
      .subscribe({
        next: () => {

          alert('Rendimiento registrado');

          this.cargarRendimientos();

          this.formulario.reset({
            velocidad: 5,
            resistencia: 5,
            tecnica: 5,
            disciplina: 5
          });

        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  cargarRendimientos() {

    this.rendimientoService.obtenerRendimientos(this.jugadorId)
      .subscribe(data => {
        this.rendimientos = data;
      });

    this.rendimientoService.obtenerResumen(this.jugadorId)
      .subscribe(data => {
        this.resumen = data;
      });
  }
}
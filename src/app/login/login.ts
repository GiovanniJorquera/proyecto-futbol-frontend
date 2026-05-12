import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  cargando = false;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.loginForm = this.fb.group({
      user: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.errorMessage = '';
    const { user, password } = this.loginForm.value;

    this.authService.login(user, password).subscribe(ok => {
      this.cargando = false;
      if (ok) {
        const rol = this.authService.getRol();
        if (rol === 'cliente') this.router.navigate(['/vista-cliente']);
        else if (rol === 'profesor') this.router.navigate(['/vista-profesor']);
        else this.router.navigate(['/admin']);
      } else {
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    });
  }

  volver() {
    this.router.navigate(['/inicio']);
  }
}
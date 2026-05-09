import { Routes } from '@angular/router';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio)
  },
  {
    path: 'formulario',
    loadComponent: () => import('./formulario/formulario').then(m => m.FormularioComponent)
  },
  {
    path: 'ficha-temporada',
    loadComponent: () =>
      import('./ficha-temporada/ficha-temporada')
        .then(m => m.FichaTemporadaComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.AdminComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pagos/registro',
    loadComponent: () =>
      import('./pages/pagos/registro-pago/registro-pago')
        .then(m => m.RegistroPagoComponent)
  },
  {
    path: 'pagos/validacion',
    loadComponent: () =>
      import('./pages/pagos/validacion-pagos/validacion-pagos')
        .then(m => m.ValidacionPagosComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);

  login(user: string, password: string): Observable<boolean> {
    return this.http.post<{ token: string; usuario: any }>(`${this.apiUrl}/login`, { user, password }).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', response.token);
          if (response.usuario) {
            localStorage.setItem('usuario', JSON.stringify(response.usuario));
          }
        }
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  getUsuario(): any {
    if (!isPlatformBrowser(this.platformId)) return null;
    const u = localStorage.getItem('usuario');
    try { return u ? JSON.parse(u) : null; } catch { return null; }
  }

  getRol(): string | null {
    return this.getUsuario()?.rol ?? null;
  }
}

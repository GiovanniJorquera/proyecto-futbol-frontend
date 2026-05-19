import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RendimientoService {

  private apiUrl = `${environment.apiUrl}/rendimientos`;

  constructor(private http: HttpClient) {}

  crearRendimiento(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  obtenerRendimientos(jugadorId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${jugadorId}`);
  }

  obtenerResumen(jugadorId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/resumen/${jugadorId}`);
  }
}
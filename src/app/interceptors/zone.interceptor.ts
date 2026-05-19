import { HttpInterceptorFn } from '@angular/common/http';
import { ApplicationRef, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

export const zoneInterceptor: HttpInterceptorFn = (req, next) => {
  const zone = inject(NgZone);
  const appRef = inject(ApplicationRef);

  const forceCD = () => setTimeout(() => { try { appRef.tick(); } catch (_) {} }, 0);

  return new Observable(observer => {
    next(req).subscribe({
      next: v => { zone.run(() => observer.next(v)); forceCD(); },
      error: e => { zone.run(() => observer.error(e)); forceCD(); },
      complete: () => zone.run(() => observer.complete()),
    });
  });
};

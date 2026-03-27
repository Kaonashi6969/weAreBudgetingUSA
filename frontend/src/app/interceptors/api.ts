import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export const apiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const platform = Capacitor.getPlatform();

  // Replace this with your actual production backend URL
  const PROD_API_BASE = 'https://api.wearebudgeting.com';
  // Use 10.0.2.2 for Android emulator to reach host localhost
  const DEV_API_BASE = 'http://10.0.2.2:3000';

  let apiUrl = req.url;

  // For Live Reload, we always want to use the backend IP if we are on a mobile platform
  // even if isNativePlatform() returns false because it's served via HTTP.
  if (apiUrl.startsWith('/api')) {
    const isMobile = platform === 'android' || platform === 'ios';
    const base = isDevMode() ? (isMobile ? DEV_API_BASE : '') : PROD_API_BASE;

    if (base) {
      apiUrl = `${base}${apiUrl}`;
    }
  }

  const apiReq = req.clone({
    url: apiUrl,
    withCredentials: true, // Mandatory for cross-origin cookies on mobile
  });

  return next(apiReq);
};

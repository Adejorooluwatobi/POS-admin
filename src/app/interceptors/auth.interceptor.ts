import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for login and other auth endpoints
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  const token = localStorage.getItem('retail_os_token');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};

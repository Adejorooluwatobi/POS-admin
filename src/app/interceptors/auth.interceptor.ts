import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ContextService } from '../services/context.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only skip interceptor for public/anonymous auth endpoints (login, registration)
  const anonymousAuthEndpoints = [
    '/api/auth/login-admin',
    '/api/auth/login-pos',
    '/api/auth/login-customer',
    '/api/auth/register-tenant',
    '/api/auth/register-customer'
  ];
  const isAnonymousAuth = anonymousAuthEndpoints.some(endpoint => req.url.includes(endpoint));
  if (isAnonymousAuth) {
    return next(req);
  }

  const token = localStorage.getItem('retail_os_token');
  const contextService = inject(ContextService);
  const isDemo = localStorage.getItem('retail_os_is_demo') === 'true';

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach Tenant Context (except when SuperAdmin lists all tenants)
  const isListingTenants = req.method === 'GET' && (req.url.endsWith('/api/tenants') || req.url.includes('/api/tenants?'));
  const effectiveTenantId = contextService.effectiveTenantId();
  if (effectiveTenantId && !isListingTenants) {
    headers['X-Tenant-Id'] = effectiveTenantId;
  }

  // Attach Store Context
  const effectiveStoreId = contextService.effectiveStoreId();
  if (effectiveStoreId) {
    headers['X-Store-Id'] = effectiveStoreId;
  }

  const requestToExecute = Object.keys(headers).length > 0 
    ? next(req.clone({ setHeaders: headers })) 
    : next(req);

  if (isDemo) {
    return requestToExecute.pipe(
      catchError(() => {
        // Clean slate sandbox fallback for demo visitor tour
        const fallbackBody: any = req.url.includes('summary') || req.url.includes('stats') || req.url.includes('analytics')
          ? { totalRevenue: 0, todaySales: 0, orderCount: 0, activeTerminals: 0, chartData: [] }
          : [];
        return of(new HttpResponse({ status: 200, body: fallbackBody }));
      })
    );
  }

  return requestToExecute;
};

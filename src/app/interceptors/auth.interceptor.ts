import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ContextService } from '../services/context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for login and other auth endpoints
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  const token = localStorage.getItem('retail_os_token');
  const contextService = inject(ContextService);

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

  if (Object.keys(headers).length > 0) {
    const cloned = req.clone({
      setHeaders: headers
    });
    return next(cloned);
  }

  return next(req);
};

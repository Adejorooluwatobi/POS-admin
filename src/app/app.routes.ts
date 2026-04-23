import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { LayoutComponent } from './shared/layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { TransactionsComponent } from './pages/transactions/transactions';
import { ProductsComponent } from './pages/products/products';
import { InventoryComponent } from './pages/inventory/inventory';
import { CustomersComponent } from './pages/customers/customers';
import { StaffComponent } from './pages/staff/staff';
import { SettingsComponent } from './pages/settings/settings';
import { ReportsComponent } from './pages/reports/reports';
import { AuditComponent } from './pages/audit/audit';
import { StoresComponent } from './pages/stores/stores';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', title: 'Login — RetailOS', component: LoginComponent },
  {
    path: 'app',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', title: 'Dashboard — RetailOS', component: DashboardComponent },
      { path: 'transactions', title: 'Transactions — RetailOS', component: TransactionsComponent },
      { path: 'products', title: 'Products — RetailOS', component: ProductsComponent },
      { path: 'inventory', title: 'Inventory — RetailOS', component: InventoryComponent },
      { path: 'customers', title: 'Customers — RetailOS', component: CustomersComponent },
      { path: 'staff', title: 'Staff — RetailOS', component: StaffComponent },
      { path: 'settings', title: 'Settings — RetailOS', component: SettingsComponent },
      { path: 'reports', title: 'Reports — RetailOS', component: ReportsComponent },
      { path: 'audit', title: 'Audit Logs — RetailOS', component: AuditComponent },
      { path: 'stores', title: 'All Stores — RetailOS', component: StoresComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

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
import { RolesComponent } from './pages/roles/roles';
import { PromotionsComponent } from './pages/promotions/promotions';
import { TerminalsComponent } from './pages/terminals/terminals';
import { TillSessionsComponent } from './pages/till-sessions/till-sessions';
import { CategoriesComponent } from './pages/categories/categories';
import { GiftCardsComponent } from './pages/gift-cards/gift-cards';
import { LoyaltyComponent } from './pages/loyalty/loyalty';
import { ProfileComponent } from './pages/profile/profile';

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
      { path: 'roles', title: 'Roles — RetailOS', component: RolesComponent },
      { path: 'promotions', title: 'Promotions — RetailOS', component: PromotionsComponent },
      { path: 'terminals', title: 'Terminals — RetailOS', component: TerminalsComponent },
      { path: 'till-sessions', title: 'Till Sessions — RetailOS', component: TillSessionsComponent },
      { path: 'categories', title: 'Categories — RetailOS', component: CategoriesComponent },
      { path: 'gift-cards', title: 'Gift Cards — RetailOS', component: GiftCardsComponent },
      { path: 'loyalty', title: 'Loyalty Ledger — RetailOS', component: LoyaltyComponent },
      { path: 'profile', title: 'My Profile — RetailOS', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

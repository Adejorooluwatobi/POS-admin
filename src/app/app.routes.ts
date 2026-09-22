import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { LayoutComponent } from './shared/layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { TransactionsComponent } from './pages/transactions/transactions';
import { TransactionReceiptComponent } from './pages/transactions/receipt/transaction-receipt';
import { ProductsComponent } from './pages/products/products';
import { ProductFormComponent } from './pages/products/form/product-form';
import { ProductDetailComponent } from './pages/products/detail/product-detail';
import { InventoryComponent } from './pages/inventory/inventory';
import { RequisitionsComponent } from './pages/inventory/requisitions/requisitions';
import { RequisitionCreateComponent } from './pages/inventory/requisitions/create/requisition-create';
import { RequisitionDetailComponent } from './pages/inventory/requisitions/detail/requisition-detail';
import { OrdersComponent } from './pages/inventory/orders/orders';
import { OrderCreateComponent } from './pages/inventory/orders/create/order-create';
import { OrderDetailComponent } from './pages/inventory/orders/detail/order-detail';
import { InventoryDetailComponent } from './pages/inventory/detail/inventory-detail';
import { SeedInventoryComponent } from './pages/inventory/seed/seed-inventory';
import { CustomersComponent } from './pages/customers/customers';
import { CustomerFormComponent } from './pages/customers/form/customer-form';
import { CustomerDetailComponent } from './pages/customers/detail/customer-detail';
import { StaffComponent } from './pages/staff/staff';
import { StaffFormComponent } from './pages/staff/form/staff-form';
import { StaffDetailComponent } from './pages/staff/detail/staff-detail';
import { SettingsComponent } from './pages/settings/settings';
import { ReportsComponent } from './pages/reports/reports';
import { AuditComponent } from './pages/audit/audit';
import { AuditDetailComponent } from './pages/audit/detail/audit-detail';
import { StoresComponent } from './pages/stores/stores';
import { StoreFormComponent } from './pages/stores/form/store-form';
import { StoreDetailsComponent } from './pages/stores/details/store-details';
import { RolesComponent } from './pages/roles/roles';
import { RoleFormComponent } from './pages/roles/form/role-form';
import { RoleDetailComponent } from './pages/roles/detail/role-detail';
import { PromotionsComponent } from './pages/promotions/promotions';
import { PromotionFormComponent } from './pages/promotions/form/promotion-form';
import { PromotionDetailComponent } from './pages/promotions/detail/promotion-detail';
import { TerminalsComponent } from './pages/terminals/terminals';
import { TerminalFormComponent } from './pages/terminals/form/terminal-form';
import { TillSessionsComponent } from './pages/till-sessions/till-sessions';
import { TillSessionDetailComponent } from './pages/till-sessions/detail/till-session-detail';
import { CategoriesComponent } from './pages/categories/categories';
import { CategoryFormComponent } from './pages/categories/form/category-form';
import { CategoryDetailComponent } from './pages/categories/detail/category-detail';
import { GiftCardsComponent } from './pages/gift-cards/gift-cards';
import { GiftCardCreateComponent } from './pages/gift-cards/create/gift-card-create';
import { GiftCardDetailComponent } from './pages/gift-cards/detail/gift-card-detail';
import { LoyaltyComponent } from './pages/loyalty/loyalty';
import { LoyaltyDetailComponent } from './pages/loyalty/detail/loyalty-detail';
import { ProfileComponent } from './pages/profile/profile';
import { TenantsComponent } from './pages/tenants/tenants';
import { TenantDetailsComponent } from './pages/tenants/details/tenant-details';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', title: 'Login — RetailOS', component: LoginComponent },
  {
    path: 'app',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', title: 'Dashboard — RetailOS', component: DashboardComponent },
      { path: 'tenants', title: 'Tenants — RetailOS', component: TenantsComponent },
      { path: 'tenants/:id', title: 'Tenant Details — RetailOS', component: TenantDetailsComponent },

      // Stores
      { path: 'stores', title: 'All Stores — RetailOS', component: StoresComponent },
      { path: 'stores/new', title: 'New Store — RetailOS', component: StoreFormComponent },
      { path: 'stores/:id', title: 'Store Details — RetailOS', component: StoreDetailsComponent },
      { path: 'stores/:id/edit', title: 'Edit Store — RetailOS', component: StoreFormComponent },

      // Products
      { path: 'products', title: 'Products — RetailOS', component: ProductsComponent },
      { path: 'products/new', title: 'New Product — RetailOS', component: ProductFormComponent },
      { path: 'products/:id', title: 'Product Details — RetailOS', component: ProductDetailComponent },
      { path: 'products/:id/edit', title: 'Edit Product — RetailOS', component: ProductFormComponent },

      // Categories
      { path: 'categories', title: 'Categories — RetailOS', component: CategoriesComponent },
      { path: 'categories/new', title: 'New Category — RetailOS', component: CategoryFormComponent },
      { path: 'categories/:id', title: 'Category Details — RetailOS', component: CategoryDetailComponent },
      { path: 'categories/:id/edit', title: 'Edit Category — RetailOS', component: CategoryFormComponent },

      // Customers
      { path: 'customers', title: 'Customers — RetailOS', component: CustomersComponent },
      { path: 'customers/new', title: 'New Customer — RetailOS', component: CustomerFormComponent },
      { path: 'customers/:id', title: 'Customer Details — RetailOS', component: CustomerDetailComponent },
      { path: 'customers/:id/edit', title: 'Edit Customer — RetailOS', component: CustomerFormComponent },

      // Promotions
      { path: 'promotions', title: 'Promotions — RetailOS', component: PromotionsComponent },
      { path: 'promotions/new', title: 'New Promotion — RetailOS', component: PromotionFormComponent },
      { path: 'promotions/:id', title: 'Promotion Details — RetailOS', component: PromotionDetailComponent },
      { path: 'promotions/:id/edit', title: 'Edit Promotion — RetailOS', component: PromotionFormComponent },

      // Gift Cards
      { path: 'gift-cards', title: 'Gift Cards — RetailOS', component: GiftCardsComponent },
      { path: 'gift-cards/new', title: 'Issue Gift Card — RetailOS', component: GiftCardCreateComponent },
      { path: 'gift-cards/:id', title: 'Gift Card Details — RetailOS', component: GiftCardDetailComponent },

      // Staff Management
      { path: 'staff', title: 'Staff — RetailOS', component: StaffComponent },
      { path: 'staff/new', title: 'New Staff Member — RetailOS', component: StaffFormComponent },
      { path: 'staff/:id', title: 'Staff Profile — RetailOS', component: StaffDetailComponent },
      { path: 'staff/:id/edit', title: 'Edit Staff Member — RetailOS', component: StaffFormComponent },

      // Roles & Permissions
      { path: 'roles', title: 'Roles — RetailOS', component: RolesComponent },
      { path: 'roles/new', title: 'New Role — RetailOS', component: RoleFormComponent },
      { path: 'roles/:id', title: 'Role Details — RetailOS', component: RoleDetailComponent },
      { path: 'roles/:id/edit', title: 'Edit Role — RetailOS', component: RoleFormComponent },

      // Inventory & Logistics
      { path: 'inventory', title: 'Inventory — RetailOS', component: InventoryComponent },
      { path: 'inventory/requisitions', title: 'Requisitions — RetailOS', component: RequisitionsComponent },
      { path: 'inventory/requisitions/new', title: 'New Requisition — RetailOS', component: RequisitionCreateComponent },
      { path: 'inventory/requisitions/:id', title: 'Requisition Details — RetailOS', component: RequisitionDetailComponent },
      { path: 'inventory/orders', title: 'Movement Orders — RetailOS', component: OrdersComponent },
      { path: 'inventory/orders/new', title: 'New Movement Order — RetailOS', component: OrderCreateComponent },
      { path: 'inventory/orders/:id', title: 'Order Details — RetailOS', component: OrderDetailComponent },
      { path: 'inventory/seed', title: 'Seed Inventory — RetailOS', component: SeedInventoryComponent },
      { path: 'inventory/:id', title: 'Stock Details — RetailOS', component: InventoryDetailComponent },

      // Transactions & Receipts
      { path: 'transactions', title: 'Transactions — RetailOS', component: TransactionsComponent },
      { path: 'transactions/:id', title: 'Transaction Receipt — RetailOS', component: TransactionReceiptComponent },

      // Till Sessions
      { path: 'till-sessions', title: 'Till Sessions — RetailOS', component: TillSessionsComponent },
      { path: 'till-sessions/:id', title: 'Till Session Details — RetailOS', component: TillSessionDetailComponent },

      // Loyalty Ledger
      { path: 'loyalty', title: 'Loyalty Ledger — RetailOS', component: LoyaltyComponent },
      { path: 'loyalty/:id', title: 'Loyalty Audit — RetailOS', component: LoyaltyDetailComponent },

      // Audit Logs
      { path: 'audit', title: 'Audit Logs — RetailOS', component: AuditComponent },
      { path: 'audit/:id', title: 'Audit Entry Details — RetailOS', component: AuditDetailComponent },

      // Terminals & Hardware
      { path: 'terminals', title: 'Terminals — RetailOS', component: TerminalsComponent },
      { path: 'terminals/new', title: 'Register Terminal — RetailOS', component: TerminalFormComponent },
      { path: 'terminals/:id/edit', title: 'Edit Terminal — RetailOS', component: TerminalFormComponent },
      { path: 'settings', title: 'Settings — RetailOS', component: SettingsComponent },
      { path: 'reports', title: 'Reports — RetailOS', component: ReportsComponent },
      { path: 'profile', title: 'My Profile — RetailOS', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

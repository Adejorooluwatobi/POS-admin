export interface Account {
  pass: string;
  role: 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'SUPERVISOR';
  name: string;
  store: string | null;
  initials: string;
  tenantId?: string | null;
}

export interface Store {
  id?: string;
  code: string;
  name: string;
  city: string;
  address: string;
  state?: string;
  country?: string;
  phone?: string;
  timezone?: string;
  terminals: number;
  active: boolean;
  todayRevenue: number;
  txCount: number;
  staff: number;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  cashier: string;
  customer: string;
  method: string;
  items: number;
  amount: number;
  status: 'COMPLETED' | 'VOIDED' | 'REFUNDED';
  store: string;
}

export interface Product {
  id?: string;
  n: string; // Name
  e: string; // Emoji/Icon
  sku: string; // MasterSku
  cat: string; // Category
  cost: number;
  price: number;
  tax: 'STANDARD' | 'ZERO' | 'EXEMPT' | 'REDUCED';
  status: 'ACTIVE' | 'INACTIVE';
  brand?: string;
  description?: string;
  categoryId?: string;
  weight?: number;
  uom?: string;
}

export interface InventoryItem {
  id?: string;
  n: string; // Product/Variant Name
  e: string; // Icon
  oh: number; // Quantity On Hand
  res: number; // Quantity Reserved
  ro: number; // Reorder Point
  roQty?: number; // Reorder Quantity
  s: 'OK' | 'LOW' | 'OUT';
  storeId?: string;
  variantId?: string;
}

export interface Customer {
  id?: string;
  n: string; // Full name (mapping helper)
  firstName?: string;
  lastName?: string;
  e: string; // Email
  ph: string;
  loy: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  pts: number;
  spend: number;
  last: string;
  active?: boolean;
}

export interface Staff {
  id?: string;
  n: string; // Full name (mapping helper)
  firstName?: string;
  lastName?: string;
  email?: string;
  no: string; // EmployeeNo
  role: string; // SystemRole string
  roleId?: string;
  store: string; // Store code or name
  storeId?: string;
  last: string;
  active: boolean;
  sales: number;
  txCount: number;
  hiredAt?: string;
}

export interface Role {
  id?: string;
  name: string;
  description?: string;
  permissions?: { [key: string]: boolean };
  systemRole?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface Promotion {
  id?: string;
  name: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED' | 'BOGO' | 'BUNDLE';
  value: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  scope: 'PRODUCT' | 'CATEGORY' | 'CART';
  targetId?: string; // ProductId or CategoryId
}
export interface Terminal {
  id?: string;
  terminalNo: string;
  name: string;
  ipAddress?: string;
  lastSync?: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  storeId: string;
}

export interface TillSession {
  id?: string;
  terminalId: string;
  staffId: string;
  staffName?: string;
  openTime: string;
  closeTime?: string;
  openBalance: number;
  closeBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  isActive?: boolean;
  parentId?: string;
}

export interface GiftCard {
  id?: string;
  cardNumber: string;
  balance: number;
  initialValue: number;
  expiresAt?: string;
  isActive: boolean;
  issuedAt: string;
}

export interface LoyaltyLedgerEntry {
  id?: string;
  customerId: string;
  transactionId?: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Account {
  pass: string;
  role: 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'SUPERVISOR';
  name: string;
  store: string | null;
  initials: string;
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
  n: string;
  e: string;
  sku: string;
  cat: string;
  cost: number;
  price: number;
  tax: 'STANDARD' | 'ZERO' | 'EXEMPT' | 'REDUCED';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface InventoryItem {
  n: string;
  e: string;
  oh: number;
  res: number;
  ro: number;
  s: 'OK' | 'LOW' | 'OUT';
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
}

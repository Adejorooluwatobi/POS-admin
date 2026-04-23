export interface Account {
  pass: string;
  role: 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'SUPERVISOR';
  name: string;
  store: string | null;
  initials: string;
}

export interface Store {
  name: string;
  city: string;
  address: string;
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
  n: string;
  e: string;
  ph: string;
  loy: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  pts: number;
  spend: number;
  last: string;
}

export interface Staff {
  n: string;
  no: string;
  role: string;
  store: string;
  last: string;
  active: boolean;
  sales: number;
  txCount: number;
}

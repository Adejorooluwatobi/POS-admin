export interface Account {
  sub: string;
  email: string;
  pass: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STORE_MANAGER' | 'MANAGER' | 'CASHIER' | 'SUPERVISOR';
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
  isActive?: boolean;
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
  name?: string; // Alias for name
  Name?: string; // Alias for Name
  e: string; // Emoji/Icon
  sku: string; // MasterSku
  cat: string; // Category
  cost: number;
  price: number;
  barcode?: string;
  tax: 'STANDARD' | 'ZERO' | 'EXEMPT' | 'REDUCED';
  taxRate?: number;
  status: 'ACTIVE' | 'INACTIVE';
  brand?: string;
  description?: string;
  categoryId?: string;
  weight?: number;
  uom?: string;
  isActive?: boolean;
  barcodes?: string[];
  targetStoreIds?: string[];
  storeOverrides?: StoreProductOverride[];
  variants?: ProductVariant[];
  Variants?: ProductVariant[];
  singlesPerRoll?: number;
  rollsPerPack?: number;
  singlesPerPack?: number;
  rollPrice?: number;
  packPrice?: number;
}

export interface ProductVariant {
  id: string;
  Id?: string;
  sku: string;
  SKU?: string;
  name?: string;
  Name?: string;
  barcode?: string;
  basePrice?: number;
  costPrice?: number;
  unitOfMeasure?: string;
}

export interface StoreProductOverride {
  id: string;
  storeId: string;
  price: number;
  rollPrice?: number;
  packPrice?: number;
  isActive: boolean;
  modifiedBy?: string;
}

export interface InventoryItem {
  id?: string;
  n: string; // Product/Variant Name
  e: string; // Icon
  sku?: string; // SKU
  oh: number; // Quantity On Hand
  res: number; // Quantity Reserved
  ro: number; // Reorder Point
  roQty?: number; // Reorder Quantity
  s: 'OK' | 'LOW' | 'OUT';
  storeId?: string;
  variantId?: string;
  reason?: string;
  singlesPerRoll?: number;
  rollsPerPack?: number;
  formatted?: string;
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
  pin?: string;
  hasPin?: boolean;
  hiredAt?: string;
  password?: string;
  hasPassword?: boolean;
  revenue?: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    lifetime: number;
  };
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
  storeId?: string | null;
  targetId?: string; // ProductId or CategoryId
}
export interface Terminal {
  id: string;
  terminalCode: string;
  name: string;
  storeId: string;
  ipAddress?: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  pairingCode?: string;
  lastPingAt?: Date;
  createdAt: Date;
}

export interface TillSession {
  id?: string;
  terminalId: string;
  staffId: string;
  staffName?: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingCash?: number;
  expectedCash?: number;
  variance?: number;
  status: 'Open' | 'Closed' | 'OPEN' | 'CLOSED';
  createdAt?: string;
  notes?: string;

  // Legacy field support for older data or UI
  openTime?: string;
  closeTime?: string;
  openBalance?: number;
  closeBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
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
  issuingStoreId?: string | null;
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

export interface InventoryOrder {
  id: string;
  orderNumber: string;
  type: 'HqToStore' | 'StoreToStore';
  status: 'Draft' | 'Dispatched' | 'Received' | 'Approved' | 'Disputed' | 'Resolved' | 'Cancelled';
  sourceStoreId?: string;
  sourceStoreName?: string;
  destinationStoreId: string;
  destinationStoreName?: string;
  createdByStaffId: string;
  createdByName?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  approvedAt?: string;
  items: InventoryOrderItemLine[];
  disputeNotes?: string;
  disputePhotoUrl?: string;
  stockRequisitionId?: string;
}

export interface InventoryOrderItemLine {
  id: string;
  variantId: string;
  variantName?: string;
  sku?: string;
  quantityOrdered: number;
  quantityReceived?: number;
}

export interface StockRequisition {
  id: string;
  requisitionNumber: string;
  status: 'Pending' | 'UnderReview' | 'Approved' | 'PartiallyFulfilled' | 'FullyFulfilled' | 'Rejected' | 'Cancelled';
  requestingStoreId: string;
  requestingStoreName?: string;
  createdByStaffId: string;
  createdByName?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  items: StockRequisitionItemLine[];
}

export interface StockRequisitionItemLine {
  id: string;
  variantId: string;
  variantName?: string;
  sku?: string;
  quantityRequested: number;
  quantityFulfilled: number;
}

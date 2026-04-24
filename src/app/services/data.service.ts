import { Injectable } from '@angular/core';
import { Account, Store, Transaction, Product, InventoryItem, Customer, Staff } from '../models/pos.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public accounts: Record<string, Account> = {
    'owner@retailos.ng': { pass: 'owner123', role: 'SUPER_ADMIN', name: 'Gold Adejoro (Owner)', store: null, initials: 'GA' },
    'vi@retailos.ng': { pass: 'store123', role: 'STORE_MANAGER', name: 'Temi Oladipo', store: 'LG-01', initials: 'TO' },
    'ik@retailos.ng': { pass: 'store123', role: 'STORE_MANAGER', name: 'Kunle Peters', store: 'LG-02', initials: 'KP' },
  };

  public stores: Record<string, Store> = {
    'LG-01': { code: 'LG-01', name: 'Victoria Island Store', city: 'Lagos', address: '23 Adeola Hopewell, VI', terminals: 4, active: true, todayRevenue: 842500, txCount: 247, staff: 5 },
    'LG-02': { code: 'LG-02', name: 'Ikeja Store', city: 'Lagos', address: '15 Allen Avenue, Ikeja', terminals: 3, active: true, todayRevenue: 621000, txCount: 183, staff: 4 },
  };

  public transactions: Transaction[] = [
    { id: 'LG01-001', date: 'Jun 1', time: '08:12', cashier: 'Gold (EMP-001)', customer: 'Amara Okafor', method: 'CASH', items: 5, amount: 4850, status: 'COMPLETED', store: 'LG-01' },
    { id: 'LG01-002', date: 'Jun 1', time: '08:34', cashier: 'Gold (EMP-001)', customer: 'Walk-in', method: 'CARD', items: 2, amount: 1750, status: 'COMPLETED', store: 'LG-01' },
    { id: 'LG01-003', date: 'Jun 1', time: '09:01', cashier: 'Sola (EMP-002)', customer: 'Tunde Adeyemi', method: 'CARD', items: 8, amount: 12400, status: 'COMPLETED', store: 'LG-01' },
    { id: 'LG01-004', date: 'Jun 1', time: '09:22', cashier: 'Sola (EMP-002)', customer: 'Walk-in', method: 'CASH', items: 1, amount: 350, status: 'COMPLETED', store: 'LG-01' },
    { id: 'LG01-005', date: 'Jun 1', time: '09:45', cashier: 'Gold (EMP-001)', customer: 'Ngozi Eze', method: 'MOBILE', items: 3, amount: 3200, status: 'COMPLETED', store: 'LG-01' },
    { id: 'LG01-006', date: 'Jun 1', time: '10:11', cashier: 'Sola (EMP-002)', customer: 'Walk-in', method: 'CASH', items: 6, amount: 5600, status: 'VOIDED', store: 'LG-01' },
    { id: 'LG02-001', date: 'Jun 1', time: '08:20', cashier: 'Kunle (EMP-005)', customer: 'Walk-in', method: 'CASH', items: 4, amount: 3400, status: 'COMPLETED', store: 'LG-02' },
    { id: 'LG02-002', date: 'Jun 1', time: '09:15', cashier: 'Kunle (EMP-005)', customer: 'Chidi Obi', method: 'CARD', items: 11, amount: 18500, status: 'COMPLETED', store: 'LG-02' },
  ];

  public products: Product[] = [
    { n: 'Coca-Cola 50cl', e: '🥤', sku: 'BEV-001', cat: 'Beverages', cost: 220, price: 350, tax: 'STANDARD', status: 'ACTIVE' },
    { n: 'Peak Milk 400g', e: '🥛', sku: 'DAI-001', cat: 'Dairy', cost: 1200, price: 1800, tax: 'ZERO', status: 'ACTIVE' },
    { n: 'Indomie 5-pack', e: '🍜', sku: 'SNK-004', cat: 'Snacks', cost: 450, price: 750, tax: 'ZERO', status: 'ACTIVE' },
    { n: 'Omo Detergent 1kg', e: '🧺', sku: 'HSH-001', cat: 'Household', cost: 700, price: 1100, tax: 'STANDARD', status: 'ACTIVE' },
    { n: 'Dettol Soap 3pk', e: '🧼', sku: 'PER-001', cat: 'Personal Care', cost: 850, price: 1400, tax: 'EXEMPT', status: 'ACTIVE' },
    { n: 'Pringles Original', e: '🍿', sku: 'SNK-002', cat: 'Snacks', cost: 1100, price: 1800, tax: 'STANDARD', status: 'ACTIVE' },
    { n: 'Water 75cl', e: '💧', sku: 'BEV-003', cat: 'Beverages', cost: 80, price: 150, tax: 'ZERO', status: 'ACTIVE' },
    { n: 'Butter 250g', e: '🧈', sku: 'DAI-002', cat: 'Dairy', cost: 600, price: 950, tax: 'ZERO', status: 'ACTIVE' },
  ];

  public inventory: InventoryItem[] = [
    { n: 'Coca-Cola 50cl', e: '🥤', oh: 240, res: 12, ro: 50, s: 'OK' },
    { n: 'Peak Milk 400g', e: '🥛', oh: 38, res: 5, ro: 40, s: 'LOW' },
    { n: 'Butter 250g', e: '🧈', oh: 22, res: 2, ro: 30, s: 'LOW' },
    { n: 'Pringles Original', e: '🍿', oh: 14, res: 0, ro: 20, s: 'LOW' },
    { n: 'Indomie 5-pack', e: '🍜', oh: 178, res: 15, ro: 50, s: 'OK' },
    { n: 'Omo Detergent 1kg', e: '🧺', oh: 65, res: 3, ro: 20, s: 'OK' },
  ];

  public customers: Customer[] = [
    { n: 'Amara Okafor', e: 'amara@email.com', ph: '08012345678', loy: 'LOY-001', tier: 'GOLD', pts: 3200, spend: 142000, last: 'Jun 1' },
    { n: 'Tunde Adeyemi', e: 'tunde@email.com', ph: '08098765432', loy: 'LOY-002', tier: 'SILVER', pts: 1100, spend: 58000, last: 'Jun 1' },
    { n: 'Ngozi Eze', e: 'ngozi@email.com', ph: '07031234567', loy: 'LOY-003', tier: 'BRONZE', pts: 450, spend: 21500, last: 'Jun 1' },
    { n: 'Chidi Obi', e: 'chidi@email.com', ph: '08155443322', loy: 'LOY-004', tier: 'PLATINUM', pts: 7800, spend: 380000, last: 'May 30' },
  ];

  public staff: Staff[] = [
    { n: 'Gold Adejoro', no: 'EMP-001', role: 'MANAGER', store: 'LG-01', last: 'Now', active: true, sales: 842500, txCount: 127 },
    { n: 'Sola Fashola', no: 'EMP-002', role: 'CASHIER', store: 'LG-01', last: '2h ago', active: true, sales: 310200, txCount: 84 },
    { n: 'Bola Adekunle', no: 'EMP-003', role: 'CASHIER', store: 'LG-01', last: 'Yesterday', active: true, sales: 215000, txCount: 62 },
    { n: 'Temi Oladipo', no: 'EMP-004', role: 'SUPERVISOR', store: 'LG-01', last: '3d ago', active: true, sales: 180000, txCount: 45 },
    { n: 'Kunle Peters', no: 'EMP-005', role: 'CASHIER', store: 'LG-02', last: '5d ago', active: false, sales: 0, txCount: 0 },
  ];

  constructor() {}
}

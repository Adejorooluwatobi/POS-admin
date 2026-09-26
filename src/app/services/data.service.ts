import { Injectable } from '@angular/core';
import { Account, Store, Transaction, Product, InventoryItem, Customer, Staff } from '../models/pos.models';

/**
 * @deprecated Legacy mock service. The portal now reads all data directly from backend APIs via dedicated domain services.
 */
@Injectable({
  providedIn: 'root'
})
export class DataService {
  public accounts: Record<string, Account> = {};
  public stores: Record<string, Store> = {};
  public transactions: Transaction[] = [];
  public products: Product[] = [];
  public inventory: InventoryItem[] = [];
  public customers: Customer[] = [];
  public staff: Staff[] = [];

  constructor() {}
}


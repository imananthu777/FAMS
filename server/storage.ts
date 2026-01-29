import {
  User, InsertUser, AuditLog, InsertAuditLog,
  Notification, InsertNotification,
  Role, InsertRole, InsertAsset, Asset,
  Agreement, InsertAgreement, Bill, InsertBill
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  // Assets
  getAssets(filter?: { role?: string; branchCode?: string }): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;
  searchAssets(query: string): Promise<Asset[]>;

  // Asset Support (Transfer outcome)
  approveAssetTransfer(id: number, approvedBy: string): Promise<Asset>;

  // Payables
  getAgreements(filter?: { branchCode?: string }): Promise<Agreement[]>;
  createAgreement(agreement: InsertAgreement): Promise<Agreement>;
  getBills(filter?: { branchCode?: string }): Promise<Bill[]>;
  getBills(filter?: { branchCode?: string }): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBillStatus(id: number, status: string, remarks?: string, updatedBy?: string): Promise<Bill>;
  payBill(id: number, paidBy: string, modeOfPayment: string, utrNumber: string, paymentDate?: string): Promise<Bill>;

  // Roles
  getRoles(): Promise<Role[]>;
  getRole(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, updates: Partial<InsertRole>): Promise<Role>; // Add this method

  // Dashboard / Notifications
  getDashboardStats(filter?: { role?: string; branchCode?: string }): Promise<any>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(filter: { role?: string; branchCode?: string; username?: string }): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
}

class ExcelStorage implements IStorage {


  constructor() {
    this.seedRoles();
  }

  private async seedRoles() {
    // Ensure roles.xlsx exists and has OOB roles
    const currentRoles = await this.getRoles();

    console.log("Seeding OOB Roles...");
    const oobRoles: InsertRole[] = [
      {
        name: "HO",
        description: "Head Office User - Full Access",
        manageRoles: "true",
        assetCreation: "true", assetModification: "true", assetDeletion: "true", assetConfirmation: "true",
        initiateDisposal: "true", approveDisposal: "true",
        initiateTransfer: "true", approveTransfer: "true",
        createAgreement: "true", approveAgreement: "true",
        createBill: "true", approveBill: "true"
      },
      {
        name: "Admin",
        description: "System Administrator",
        manageRoles: "false", // Admin relies on HO for role mgmt in this spec
        assetCreation: "true", assetModification: "true", assetDeletion: "true", assetConfirmation: "true",
        initiateDisposal: "true", approveDisposal: "true",
        initiateTransfer: "true", approveTransfer: "true",
        createAgreement: "true", approveAgreement: "true",
        createBill: "true", approveBill: "true"
      },
      {
        name: "Manager",
        description: "Branch Manager - Approval Authority",
        manageRoles: "false",
        assetCreation: "false", assetModification: "false", assetDeletion: "false", assetConfirmation: "true",
        initiateDisposal: "false", approveDisposal: "true",
        initiateTransfer: "false", approveTransfer: "true",
        createAgreement: "false", approveAgreement: "true",
        createBill: "false", approveBill: "true"
      },
      {
        name: "Manager1",
        description: "Branch Manager 1",
        manageRoles: "false",
        assetCreation: "false", assetModification: "false", assetDeletion: "false", assetConfirmation: "true",
        initiateDisposal: "false", approveDisposal: "true",
        initiateTransfer: "false", approveTransfer: "true",
        createAgreement: "false", approveAgreement: "true",
        createBill: "false", approveBill: "true"
      },
      {
        name: "Manager2",
        description: "Branch Manager 2",
        manageRoles: "false",
        assetCreation: "false", assetModification: "false", assetDeletion: "false", assetConfirmation: "true",
        initiateDisposal: "false", approveDisposal: "true",
        initiateTransfer: "false", approveTransfer: "true",
        createAgreement: "false", approveAgreement: "true",
        createBill: "false", approveBill: "true"
      },
      {
        name: "BranchUser",
        description: "Standard Branch User",
        manageRoles: "false",
        assetCreation: "true", assetModification: "true", assetDeletion: "false", assetConfirmation: "true",
        initiateDisposal: "true", approveDisposal: "false",
        initiateTransfer: "true", approveTransfer: "false",
        createAgreement: "false", approveAgreement: "false",
        createBill: "false", approveBill: "false"
      }
    ];

    for (const role of oobRoles) {
      if (!currentRoles.find(r => r.name === role.name)) {
        await this.createRole(role);
        console.log(`Created missing role: ${role.name}`);
      }
    }
  }

  private async getWorkbook(filename: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
    }
    return workbook;
  }

  private async saveWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
    const filePath = path.join(DATA_DIR, filename);
    await workbook.xlsx.writeFile(filePath);
  }

  // Generic Get Data
  private async getSheetData<T>(filename: string, sheetName: string): Promise<T[]> {
    const filePath = path.join(DATA_DIR, filename);
    try {
      const workbook = await this.getWorkbook(filename);
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet || sheet.rowCount <= 1) {
        return [];
      }
      const data: T[] = [];

      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value);
      });

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const item: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            let val = cell.value;
            if (val instanceof Date) val = val.toISOString();
            // String conversion for text fields
            if (['tagNumber', 'branchCode', 'branchUser', 'status', 'name', 'type', 'ManagerID'].includes(header)) {
              val = val !== null && val !== undefined ? String(val) : val;
            }
            // Normalize field names: snake_case -> camelCase
            const normalizedKey = this.normalizeFieldName(header);
            item[normalizedKey] = val;
          }
        });
        if (item.id === undefined || item.id === null) item.id = rowNumber - 1;
        else if (typeof item.id !== 'number') item.id = Number(item.id);

        data.push(item as T);
      });

      return data;
    } catch (e) {
      console.error(`Error reading ${filename}/${sheetName}:`, e);
      return [];
    }
  }

  // Known PascalCase headers that should be converted to camelCase
  private static readonly PASCAL_TO_CAMEL: Record<string, string> = {
    'PaymentStatus': 'paymentStatus',
    'PaymentScheduledDate': 'paymentScheduledDate',
    'SecurityDeposit': 'securityDeposit',
    'NextRentRateEscalationDate': 'nextRentRateEscalationDate',
    'NextEscalationRatePercent': 'nextEscalationRatePercent',
    'BillType': 'billType',
    'Priority': 'priority',
  };

  // Normalize field names from Excel to TypeScript (camelCase)
  private normalizeFieldName(name: string): string {
    // Check if it's a known PascalCase header that needs conversion
    if (ExcelStorage.PASCAL_TO_CAMEL[name]) {
      return ExcelStorage.PASCAL_TO_CAMEL[name];
    }

    // Convert snake_case to camelCase: contract_id -> contractId, vendor_name -> vendorName
    const result = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    return result;
  }

  // Generic Add Row
  private async addRow(filename: string, sheetName: string, data: any): Promise<any> {
    const workbook = await this.getWorkbook(filename);
    let sheet = workbook.getWorksheet(sheetName);

    if (!sheet) {
      sheet = workbook.addWorksheet(sheetName);
      const headers = Object.keys(data);
      sheet.addRow(headers);
    }

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value);
    });

    // Check if new fields exist in headers, if not add them
    let headersChanged = false;
    const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    Object.keys(data).forEach(key => {
      const snakeKey = toSnakeCase(key);
      if (!headers.includes(key) && !headers.includes(snakeKey)) {
        // Add new header
        const newColIdx = headers.length > 0 ? headers.length : 1;
        sheet!.getRow(1).getCell(newColIdx).value = snakeKey;
        headers[newColIdx] = snakeKey;
        headersChanged = true;
      }
    });

    if (headersChanged) {
      // No need to save here, we'll save at the end of addRow
    }

    const rowValues: any[] = [];
    headers.forEach((header, index) => {
      if (!header) return;
      // Try exact match first, then try camelCase version of header
      const camelCaseKey = header.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = data[header] !== undefined ? data[header] : (data[camelCaseKey] !== undefined ? data[camelCaseKey] : null);
      rowValues[index - 1] = value;
    });

    sheet.addRow(rowValues);
    await this.saveWorkbook(workbook, filename);
    return { ...data, id: sheet.rowCount - 1 };
  }

  // --- ROLES ---

  async getRoles(): Promise<Role[]> {
    return this.getSheetData<Role>('roles.xlsx', 'Roles');
  }

  async getRole(name: string): Promise<Role | undefined> {
    const roles = await this.getRoles();
    return roles.find(r => r.name === name);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const roles = await this.getRoles();
    // Check if exists
    if (roles.find(r => r.name === role.name)) {
      throw new Error(`Role ${role.name} already exists`);
    }
    const newId = roles.length + 1;
    const newRole = { ...role, id: newId };
    await this.addRow('roles.xlsx', 'Roles', newRole);
    return newRole as Role;
  }

  async updateRole(id: number, updates: Partial<InsertRole>): Promise<Role> {
    const workbook = await this.getWorkbook('roles.xlsx');
    const sheet = workbook.getWorksheet('Roles');
    if (!sheet) throw new Error("Roles sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));

    let targetRow: ExcelJS.Row | undefined;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      // Assuming ID is reliable, or find by Name if ID not present in sheet yet?
      // Typically ID is first col or by header
      const idIdx = headers.indexOf('id');
      const cellId = row.getCell(idIdx > -1 ? idIdx : 1).value;
      if (Number(cellId) === Number(id)) targetRow = row;
    });

    if (!targetRow) throw new Error(`Role ${id} not found`);

    // Helper to map camelCase updates to snake_case headers if needed, 
    // OR normalized headers in addRow logic implies we might have mixed headers currently?
    // Let's rely on headers usually being consistent. 
    // BUT wait, my previous addRow used camelCaseKey mapping. 
    // So headers in Excel might be snake_case!
    // I need to be careful with header matching here.

    Object.entries(updates).forEach(([key, value]) => {
      // Try exact match
      const colIdx = headers.indexOf(key);
      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value as any;
        return;
      }

      // Try Camel -> Snake (e.g. manageRoles -> manage_roles)
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const snakeIdx = headers.indexOf(snakeKey);
      if (snakeIdx > -1) {
        targetRow!.getCell(snakeIdx).value = value as any;
      }
    });

    await this.saveWorkbook(workbook, 'roles.xlsx');
    const all = await this.getRoles();
    return all.find(r => Number(r.id) === Number(id))!;
  }

  // --- USERS ---

  async getUsers(): Promise<User[]> {
    return this.getSheetData<User>('users.xlsx', 'Users');
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const users = await this.getUsers();
    const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
    const newId = maxId + 1;
    const newUser = { ...user, id: newId };
    await this.addRow('users.xlsx', 'Users', newUser);
    return newUser as User;
  }

  // --- ASSETS ---

  async getAssets(filter?: { role?: string; branchCode?: string }): Promise<Asset[]> {
    let assets = await this.getSheetData<Asset>('assets.xlsx', 'Assets');

    // 1. Warranty Logic Check (Lazy Update)
    const today = new Date();
    let madeUpdates = false;

    assets = assets.map(a => {
      if (a.warrantyEnd && a.amcWarranty !== 'AMC') {
        const wEnd = new Date(a.warrantyEnd);
        if (wEnd < today) {
          // It's expired, should be AMC
          a.amcWarranty = 'AMC';
          // We should persist this, but doing it on every read is heavy.
          // For now, we update the object returned. 
          // Ideally, we trigger an async update or do it on viewing specific asset.
        }
      }
      return a;
    });

    if (!filter) return assets;

    // Filter Logic
    if (filter.role === 'Admin' || filter.role === 'HO') return assets;

    // Manager Logic
    if (filter.role?.includes('Manager')) {
      // Filter by ManagerID or hierarchy
      const users = await this.getUsers();
      const managedBranches = new Set<string>();
      if (filter.branchCode) managedBranches.add(filter.branchCode);

      // Find branches reporting to this manager
      users.forEach(u => {
        // Check by ManagerID field (from users.xlsx)
        const managerRole = filter.role; // e.g., "Manager1"
        const managerBranchCode = filter.branchCode;
        if ((u as any).ManagerID === managerRole || (u as any).ManagerID === managerBranchCode) {
          if (u.branchCode) managedBranches.add(u.branchCode);
        }
      });

      return assets.filter(a => {
        // Manager sees assets in their branches 
        // PLUS assets that are "TransferApprovalPending" TO or FROM their branches? 
        // Usually Approver needs to see it. 

        const inManagedBranch = managedBranches.has(String(a.branchCode));
        const fromManagedBranch = (a as any).fromBranchCode && managedBranches.has(String((a as any).fromBranchCode));

        return inManagedBranch || fromManagedBranch;
      });
    }

    // Branch User Logic
    if (filter.branchCode) {
      return assets.filter(a => {
        const inBranch = String(a.branchCode) === String(filter.branchCode);
        const transferredFromBranch = String((a as any).fromBranchCode) === String(filter.branchCode);

        return inBranch || transferredFromBranch;
      });
    }

    return assets;
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const assets = await this.getAssets();
    return assets.find(a => Number(a.id) === Number(id));
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const assets = await this.getAssets();
    const newId = assets.length + 1;
    // Defaults
    if (!asset.amcWarranty && asset.warrantyEnd) {
      const wEnd = new Date(asset.warrantyEnd);
      if (wEnd < new Date()) asset.amcWarranty = 'AMC';
      else asset.amcWarranty = 'Warranty';
    }

    // Auto-populate Link to Region (ManagerID) based on Branch
    let managerId = (asset as any).ManagerID;
    if (!managerId && asset.branchCode) {
      const users = await this.getUsers();
      // Find the branch user for this code (ignoring Managers/Admins to be safe, though branchCode should be unique)
      const branchUser = users.find(u =>
        String(u.branchCode) === String(asset.branchCode) &&
        !u.role.toLowerCase().includes('manager') &&
        u.role !== 'Admin' && u.role !== 'HO'
      );

      if (branchUser) {
        managerId = (branchUser as any).ManagerID;
      }
    }

    // Ensure status is tracked
    const newAsset = { ...asset, id: newId, ManagerID: managerId, status: asset.status || 'Active' };
    await this.addRow('assets.xlsx', 'Assets', newAsset);
    return newAsset as Asset;
  }

  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
    const workbook = await this.getWorkbook('assets.xlsx');
    const sheet = workbook.getWorksheet('Assets');
    if (!sheet) throw new Error("Assets sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));

    let targetRow: ExcelJS.Row | undefined;
    // Find row
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      // Search by ID column or first column
      const idIdx = headers.indexOf('id');
      const cellId = idIdx > -1 ? row.getCell(idIdx).value : row.getCell(1).value;
      if (Number(cellId) === Number(id)) targetRow = row;
    });

    if (!targetRow) throw new Error(`Asset ${id} not found`);

    // Update cells
    let headersUpdated = false;
    const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    Object.entries(updates).forEach(([key, value]) => {
      let colIdx = headers.indexOf(key);
      if (colIdx === -1) {
        const snakeKey = toSnakeCase(key);
        colIdx = headers.indexOf(snakeKey);
      }

      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value as any;
      } else {
        // Automatically add missing column
        const newColIdx = headers.length;
        const snakeKey = toSnakeCase(key);
        sheet.getRow(1).getCell(newColIdx).value = snakeKey;
        headers[newColIdx] = snakeKey;
        targetRow!.getCell(newColIdx).value = value as any;
        headersUpdated = true;
      }
    });

    await this.saveWorkbook(workbook, 'assets.xlsx');

    // Return updated
    const all = await this.getAssets();
    return all.find(a => Number(a.id) === Number(id))!;
  }

  async deleteAsset(id: number): Promise<void> {
    const workbook = await this.getWorkbook('assets.xlsx');
    const sheet = workbook.getWorksheet('Assets');
    if (!sheet) return;

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));
    const idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 1;

    let rowIndexToDelete = -1;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cellId = row.getCell(idIdx).value;
      if (Number(cellId) === Number(id)) {
        rowIndexToDelete = rowNumber;
      }
    });

    if (rowIndexToDelete !== -1) {
      sheet.spliceRows(rowIndexToDelete, 1);
      await this.saveWorkbook(workbook, 'assets.xlsx');
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    const assets = await this.getAssets();
    const lowerQ = query.toLowerCase();
    return assets.filter(a =>
      a.name?.toLowerCase().includes(lowerQ) ||
      a.tagNumber?.toLowerCase().includes(lowerQ)
    );
  }

  async approveAssetTransfer(id: number, approvedBy: string): Promise<Asset> {
    const originalAsset = await this.getAsset(id);
    if (!originalAsset) throw new Error("Asset not found");
    if (!originalAsset.toLocation) throw new Error("Target location missing");

    const newBranchCode = originalAsset.toLocation;
    const users = await this.getUsers();
    const branchUser = users.find(u =>
      String(u.branchCode) === String(newBranchCode) &&
      !u.role.toLowerCase().includes('manager') &&
      u.role !== 'Admin' && u.role !== 'HO'
    );

    const targetBranchName = branchUser ? branchUser.username : (newBranchCode === 'HO' ? 'Head Office' : newBranchCode);

    return await this.updateAsset(id, {
      status: 'Active',
      branchCode: newBranchCode,
      branchName: targetBranchName,
      fromBranch: originalAsset.branchName,
      fromBranchCode: originalAsset.branchCode,
      approvedBy,
      approvedAt: new Date().toISOString(),
      transferStatus: 'Transferred'
      // We keep initiatedAt, initiatedBy, etc. for history display
    });
  }

  // --- PAYABLES ---

  async getAgreements(filter?: { branchCode?: string }): Promise<Agreement[]> {
    let agreements = await this.getSheetData<Agreement>('payables.xlsx', 'Agreements');
    if (filter?.branchCode) {
      const target = String(filter.branchCode).trim().toLowerCase();
      agreements = agreements.filter(a => String(a.branchCode).trim().toLowerCase() === target);
    }
    return agreements;
  }

  async createAgreement(agreement: InsertAgreement): Promise<Agreement> {
    const ags = await this.getAgreements();
    const newId = ags.length + 1;
    const newAg = { ...agreement, id: newId };
    await this.addRow('payables.xlsx', 'Agreements', newAg);
    return newAg as Agreement;
  }

  async getBills(filter?: { branchCode?: string }): Promise<Bill[]> {
    const rawBills = await this.getSheetData<Bill>('payables.xlsx', 'Bills');

    // Data Consistency Fix: If Paid, ensure it's considered Approved (unless Rejected explicitly)
    const bills = rawBills.map(b => {
      if (b.paymentStatus === 'Paid' && b.approvalStatus === 'Pending') {
        return { ...b, approvalStatus: 'Approved' };
      }
      return b;
    });

    if (!filter?.branchCode) return bills;
    return bills.filter(b => b.branchCode === filter.branchCode);
  }

  // Role-based filtering for agreements (hierarchy support)
  async getAgreementsForRole(filter?: { role?: string; branchCode?: string }): Promise<Agreement[]> {
    let agreements = await this.getSheetData<Agreement>('payables.xlsx', 'Agreements');

    if (!filter) return agreements;

    // Admin/HO sees all
    if (filter.role === 'Admin' || filter.role === 'HO') return agreements;

    // Manager sees agreements from branches reporting to them
    if (filter.role?.includes('Manager')) {
      const users = await this.getUsers();
      const managedBranches = new Set<string>();
      if (filter.branchCode) managedBranches.add(filter.branchCode);

      // Find branches reporting to this manager
      users.forEach(u => {
        // Check by ManagerID field (from users.xlsx)
        const managerRole = filter.role;
        const managerBranchCode = filter.branchCode;
        if ((u as any).ManagerID === managerRole || (u as any).ManagerID === managerBranchCode) {
          if (u.branchCode) managedBranches.add(u.branchCode);
        }
      });

      return agreements.filter(a => managedBranches.has(String(a.branchCode)));
    }

    // Branch User sees only their branch
    if (filter.branchCode) {
      const target = String(filter.branchCode).trim().toLowerCase();
      return agreements.filter(a => String(a.branchCode).trim().toLowerCase() === target);
    }

    return agreements;
  }

  // Role-based filtering for bills (hierarchy support)
  async getBillsForRole(filter?: { role?: string; branchCode?: string }): Promise<Bill[]> {
    const rawBills = await this.getSheetData<Bill>('payables.xlsx', 'Bills');

    // Data Consistency Fix: If Paid, ensure it's considered Approved
    let bills = rawBills.map(b => {
      if (b.paymentStatus === 'Paid' && b.approvalStatus === 'Pending') {
        return { ...b, approvalStatus: 'Approved' };
      }
      return b;
    });

    if (!filter) return bills;

    // Admin/HO sees all
    if (filter.role === 'Admin' || filter.role === 'HO') return bills;

    // Manager sees bills from branches reporting to them
    if (filter.role?.includes('Manager')) {
      const users = await this.getUsers();
      const managedBranches = new Set<string>();
      if (filter.branchCode) managedBranches.add(filter.branchCode);

      users.forEach(u => {
        // Check by ManagerID field (from users.xlsx)
        const managerRole = filter.role;
        const managerBranchCode = filter.branchCode;
        if ((u as any).ManagerID === managerRole || (u as any).ManagerID === managerBranchCode) {
          if (u.branchCode) managedBranches.add(u.branchCode);
        }
      });

      return bills.filter(b => managedBranches.has(String(b.branchCode)));
    }

    // Branch User sees only their branch
    if (filter.branchCode) {
      return bills.filter(b => String(b.branchCode) === String(filter.branchCode));
    }

    return bills;
  }

  // Get pending bills for approval (for Manager/Admin)
  async getPendingBillsForApprover(userId: number): Promise<Bill[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    // Get all bills with Pending approval status
    const allBills = await this.getBillsForRole({ role: user.role, branchCode: user.branchCode || undefined });

    // Filter for pending approvals only
    return allBills.filter(b => b.approvalStatus === 'Pending');
  }

  // Approve a bill
  async approveBill(billId: number, approverName: string, approverId: number): Promise<Bill> {
    const workbook = await this.getWorkbook('payables.xlsx');
    const sheet = workbook.getWorksheet('Bills');
    if (!sheet) throw new Error("Bills sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));

    let targetRow: ExcelJS.Row | undefined;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const idIdx = headers.indexOf('id');
      const cellId = idIdx > -1 ? row.getCell(idIdx).value : row.getCell(1).value;
      if (Number(cellId) === Number(billId)) targetRow = row;
    });

    if (!targetRow) throw new Error(`Bill ${billId} not found`);

    // Update approval fields
    const updates: Record<string, any> = {
      approvalStatus: 'Approved',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
      approverID: approverId
    };

    Object.entries(updates).forEach(([key, value]) => {
      // Try camelCase first
      let colIdx = headers.indexOf(key);
      if (colIdx === -1) {
        // Try snake_case version
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        colIdx = headers.indexOf(snakeKey);
      }
      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value;
      }
    });

    await this.saveWorkbook(workbook, 'payables.xlsx');
    // Clear cache


    const all = await this.getBills();
    return all.find(b => Number(b.id) === Number(billId))!;
  }

  // Reject a bill
  async rejectBill(billId: number, rejectedBy: string, reason: string, rejectorId: number): Promise<Bill> {
    const workbook = await this.getWorkbook('payables.xlsx');
    const sheet = workbook.getWorksheet('Bills');
    if (!sheet) throw new Error("Bills sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));

    let targetRow: ExcelJS.Row | undefined;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const idIdx = headers.indexOf('id');
      const cellId = idIdx > -1 ? row.getCell(idIdx).value : row.getCell(1).value;
      if (Number(cellId) === Number(billId)) targetRow = row;
    });

    if (!targetRow) throw new Error(`Bill ${billId} not found`);

    // Update rejection fields
    const updates: Record<string, any> = {
      approvalStatus: 'Rejected',
      approvedBy: rejectedBy,
      approvedAt: new Date().toISOString(),
      approverID: rejectorId,
      rejectionReason: reason
    };

    Object.entries(updates).forEach(([key, value]) => {
      let colIdx = headers.indexOf(key);
      if (colIdx === -1) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        colIdx = headers.indexOf(snakeKey);
      }
      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value;
      }
    });

    await this.saveWorkbook(workbook, 'payables.xlsx');


    const all = await this.getBills();
    return all.find(b => Number(b.id) === Number(billId))!;
  }

  // Pay a bill
  async payBill(id: number, paidBy: string, modeOfPayment: string, utrNumber: string, paymentDate?: string): Promise<Bill> {
    const workbook = await this.getWorkbook('payables.xlsx');
    const sheet = workbook.getWorksheet('Bills');
    if (!sheet) throw new Error("Bills sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));

    let targetRow: ExcelJS.Row | undefined;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const idIdx = headers.indexOf('id');
      const cellId = idIdx > -1 ? row.getCell(idIdx).value : row.getCell(1).value;
      if (Number(cellId) === Number(id)) targetRow = row;
    });

    if (!targetRow) throw new Error(`Bill ${id} not found`);

    const pDate = paymentDate || new Date().toISOString();

    const updates: Record<string, any> = {
      paymentStatus: 'Paid',
      approvalStatus: 'Approved',
      paidBy: paidBy,
      paymentDate: pDate,
      modeOfPayment: modeOfPayment,
      utrNumber: utrNumber
    };

    Object.entries(updates).forEach(([key, value]) => {
      let colIdx = headers.indexOf(key);
      if (colIdx === -1) {
        // PascalCase
        const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
        colIdx = headers.indexOf(pascalKey);
      }
      if (colIdx === -1) {
        // snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        colIdx = headers.indexOf(snakeKey);
      }
      if (colIdx === -1) {
        // Case-insensitive & Space tolerant (e.g. "Payment Date")
        const lowerKey = key.toLowerCase();
        colIdx = headers.findIndex(h => h && (h.toLowerCase().replace(/ /g, '') === lowerKey || h.toLowerCase().replace(/_/g, '') === lowerKey));
      }

      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value;
      }
    });

    await this.saveWorkbook(workbook, 'payables.xlsx');


    // Notify
    const bill = (await this.getBills()).find(b => Number(b.id) === Number(id))!;
    await this.createNotification({
      title: "Bill Paid",
      message: `Bill #${bill.billNo} has been paid by ${paidBy}.`,
      type: "success",
      role: "Admin", // Notify Admin/HO
      branchCode: bill.branchCode, // And the branch
      isRead: "false",
      createdAt: new Date().toISOString()
    });

    return bill;
  }

  // Update Bill Status (Generic)
  async updateBillStatus(id: number, status: string, remarks?: string, updatedBy?: string, extras?: any): Promise<Bill> {
    const workbook = await this.getWorkbook('payables.xlsx');
    const sheet = workbook.getWorksheet('Bills');
    if (!sheet) throw new Error("Bills sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));

    let targetRow: ExcelJS.Row | undefined;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const idIdx = headers.indexOf('id');
      const cellId = idIdx > -1 ? row.getCell(idIdx).value : row.getCell(1).value;
      if (Number(cellId) === Number(id)) targetRow = row;
    });

    if (!targetRow) throw new Error(`Bill ${id} not found`);

    const updates: Record<string, any> = {
      approvalStatus: status,
    };
    if (remarks) updates.remarks = remarks; // Assuming remarks column exists or will be ignored
    // If status is Rejected, we usually set rejectionReason, but here we use generic remarks if needed

    Object.entries(updates).forEach(([key, value]) => {
      let colIdx = headers.indexOf(key);
      if (colIdx === -1) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        colIdx = headers.indexOf(snakeKey);
      }
      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value;
      }
    });

    // Handle "Hold" / Postpone specifics
    if (status === 'Hold' && extras?.paymentScheduledDate) {
      let col = headers.indexOf('paymentScheduledDate');
      if (col === -1) col = headers.indexOf('PaymentScheduledDate');
      if (col > -1) {
        targetRow!.getCell(col).value = extras.paymentScheduledDate;
      }
    }

    await this.saveWorkbook(workbook, 'payables.xlsx');


    const bill = (await this.getBills()).find(b => Number(b.id) === Number(id))!;

    // Notify
    await this.createNotification({
      title: `Bill ${status}`,
      message: `Bill #${bill.billNo} status updated to ${status} by ${updatedBy || 'System'}.`,
      type: status === 'Rejected' ? "error" : "info",
      role: "BranchUser", // Notify branch
      branchCode: bill.branchCode,
      isRead: "false",
      createdAt: new Date().toISOString()
    });

    return bill;
  }

  // Get count of pending actions for user
  async getPendingActionsCount(userId: number): Promise<number> {
    const pendingBills = await this.getPendingBillsForApprover(userId);
    return pendingBills.length;
  }

  // New helper methods for Payables redesign
  async getAgreementByContractId(contractId: string): Promise<Agreement | undefined> {
    const agreements = await this.getAgreements();
    return agreements.find(a => a.contractId === contractId);
  }

  async getBillsByContract(contractId: string): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter(b => b.contractId === contractId)
      .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  }

  async getMonthlyBillTotal(contractId: string, monthYear: string): Promise<number> {
    const bills = await this.getBillsByContract(contractId);
    return bills
      .filter(b => b.monthYear === monthYear)
      .reduce((sum, b) => sum + (b.amount || 0), 0);
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    // Validation: Contract Exists
    const agreements = await this.getAgreements();
    const ag = agreements.find(a => a.contractId === bill.contractId);
    if (!ag) {
      throw new Error(`Invalid Contract ID: ${bill.contractId}. Agreement must exist first.`);
    }

    const bills = await this.getBills();
    const newId = bills.length + 1;

    // Enrich Bill Data
    let vendorName = bill.vendorName;
    let billType = bill.billType;
    let branchCode = bill.branchCode;
    let dueDate = bill.dueDate;

    if (!vendorName && ag.vendorName) vendorName = ag.vendorName;
    if (!branchCode && ag.branchCode) branchCode = ag.branchCode;

    // Derive Bill Type
    if (!billType || billType === 'Other') {
      // Import map if possible, or duplicate logic for robustness (avoiding circular dependency if utils not imported)
      // Check local implementation or Agreement type
      const mapping: Record<string, string> = {
        "Rent Agreement": "Rent Invoice",
        "KSEB Agreement": "Electricity Bill",
        "Water Bill Agreement": "Water Bill",
        "Maintenance Agreement": "Maintenance Bill",
        "Internet Agreement": "Internet Bill",
        "Security Agreement": "Security Bill"
      };
      if (ag.type && mapping[ag.type]) {
        billType = mapping[ag.type];
      } else {
        billType = ag.type || 'Generic Bill';
      }
    }

    // Calculate Due Date if missing (Default +30 days)
    if (!dueDate) {
      const bDate = new Date(bill.billDate);
      const dDate = new Date(bDate);
      dDate.setDate(dDate.getDate() + 30);
      dueDate = dDate.toISOString().split('T')[0];
    }

    const newBill = {
      ...bill,
      id: newId,
      vendorName,
      billType,
      branchCode,
      dueDate,
      paymentStatus: 'Unpaid',
      approvalStatus: 'Pending',
      createdBy: (bill as any).createdBy
    };
    await this.addRow('payables.xlsx', 'Bills', newBill);
    return newBill as Bill;
  }


  // Get all unpaid bills for Admin/HO (for payment management)
  async getUnpaidBills(): Promise<Bill[]> {
    const bills = await this.getSheetData<Bill>('payables.xlsx', 'Bills');
    const agreements = await this.getAgreements();

    // Filter unpaid bills and ensure branchCode is populated
    return bills
      .filter(b => {
        // Check paymentStatus or PaymentStatus (Excel might have different case)
        const status = String((b as any).paymentStatus || (b as any).PaymentStatus || "");
        const approval = String((b as any).approvalStatus || "");

        // Exclude Rejected and Approved bills from Admin view (only show Pending)
        if (approval === 'Rejected' || approval === 'Approved') return false;

        return status !== 'Paid';
      })
      .map(b => {
        // If branchCode is missing, try to get it from the agreement
        if (!b.branchCode && b.contractId) {
          const agreement = agreements.find(a => a.contractId === b.contractId);
          if (agreement?.branchCode) {
            return { ...b, branchCode: agreement.branchCode };
          }
        }
        return b;
      });
  }

  // --- NOTIFICATIONS & DASHBOARD ---

  async getDashboardStats(filter?: { role?: string; branchCode?: string }): Promise<any> {
    const assets = await this.getAssets(filter);
    const today = new Date();
    const ninetyDays = new Date();
    ninetyDays.setDate(today.getDate() + 90);

    const expiringSoon = assets.filter(a => {
      let isExpiring = false;
      if (a.amcEnd) {
        const d = new Date(a.amcEnd);
        if (d >= today && d <= ninetyDays) isExpiring = true;
      }
      else if (a.warrantyEnd && a.amcWarranty !== 'AMC') {
        const d = new Date(a.warrantyEnd);
        if (d >= today && d <= ninetyDays) isExpiring = true;
      }
      return isExpiring;
    });

    // Count disposals that are in progress (not completely gone if we want to track them, but user said Disposed should reflect too)
    // "DisposalInitiated ... should reflect in current branch".
    const disposalPending = assets.filter(a =>
      ['DisposalInitiated', 'Pending Disposal', 'In Cart', 'Recommended'].includes(a.status)
    ).length;

    return {
      totalAssets: assets.filter(a => {
        const isCurrentlyInBranch = !filter?.branchCode || String(a.branchCode) === String(filter.branchCode);
        return isCurrentlyInBranch && (a.status === 'Active' || a.status === 'Disposed');
      }).length,
      expiringSoon: expiringSoon.length,
      disposalPending
    };
  }

  async getNotifications(filter: { role?: string; branchCode?: string; username?: string }): Promise<Notification[]> {
    const all = await this.getSheetData<Notification>('users.xlsx', 'Notifications');
    return all.filter(n => {
      // If specific user targetted
      if ((n as any).targetUsername) {
        return (n as any).targetUsername === filter.username;
      }
      // Otherwise fallback to role/branch broadcast
      if (n.targetRole && n.targetRole !== filter.role) return false;
      if (n.targetBranch && n.targetBranch !== filter.branchCode) return false;
      return true;
    });
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const notifs = await this.getNotifications({});
    const newId = notifs.length + 1;
    const newN = { ...notification, id: newId };
    await this.addRow('users.xlsx', 'Notifications', newN);
    return newN as Notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    const workbook = await this.getWorkbook('users.xlsx');
    const sheet = workbook.getWorksheet('Notifications');
    if (!sheet) return;
    // ... logic to update isRead ...
    // Simplified for brevity
  }
}

export const storage = new ExcelStorage();

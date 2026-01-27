import { User, Asset, InsertUser, InsertAsset, AuditLog, InsertAuditLog, GatePass, Notification, Disposal } from "@shared/schema";
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
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;
  searchAssets(query: string): Promise<Asset[]>;

  // Audit
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Dashboard
  getDashboardStats(filter?: { role?: string; branchCode?: string }): Promise<any>;

  // GatePass
  createGatePass(gp: any): Promise<GatePass>;
}

class ExcelStorage implements IStorage {
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

  private async getSheetData<T>(filename: string, sheetName: string): Promise<T[]> {
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
          // Handle Excel date objects
          if (val instanceof Date) {
            val = val.toISOString();
          }
          // Force string for known text fields to avoid Zod/Type issues
          if (['tagNumber', 'branchCode', 'branchUser', 'status', 'name', 'type', 'ReportingTo', 'ManagerID'].includes(header)) {
            val = val !== null && val !== undefined ? String(val) : val;
          }
          item[header] = val;
        }
      });
      // Fallback ID if missing
      if (item.id === undefined || item.id === null) item.id = rowNumber - 1;
      else if (typeof item.id !== 'number') item.id = Number(item.id);

      data.push(item as T);
    });
    return data;
  }

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

    // Explicitly map data to headers
    const rowValues: any[] = [];
    headers.forEach((header, index) => {
      // index is 1-based usually from eachCell, but headers starting at 1
      if (index === 0) return;
      rowValues[index - 1] = data[header] ?? null;
    });

    sheet.addRow(rowValues);
    await this.saveWorkbook(workbook, filename);
    return { ...data, id: sheet.rowCount - 1 };
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

    if (!filter) return assets;

    // Admin sees everything
    if (filter.role === 'Admin') return assets;

    // Manager sees their branch + all subordinate branches
    if (filter.role?.includes('Manager')) {
      console.log('[Storage] Manager filter - role:', filter.role, 'branchCode:', filter.branchCode);

      // Preferred method: Filter by ManagerID column if it exists and matches
      // Normalize spaces for flexible matching (handles both "Manager 1" and "Manager1")
      const normalizeRole = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
      const normalizedFilterRole = normalizeRole(filter.role);
      console.log('[Storage] Normalized filter role:', normalizedFilterRole);

      const managerAssets = assets.filter(a => {
        if (a.ManagerID) {
          const normalizedManagerId = normalizeRole(a.ManagerID);
          if (normalizedManagerId === normalizedFilterRole) return true;
        }
        // Fallback to own branch
        if (a.branchCode && String(a.branchCode) === String(filter.branchCode)) return true;
        return false;
      });

      console.log('[Storage] Found', managerAssets.length, 'assets for manager');
      if (managerAssets.length > 0) return managerAssets;

      // Fallback to hierarchy via Users table if ManagerID usage didn't yield results (or if ManagerID is missing)
      const users = await this.getUsers();
      const subordinateBranches = users
        .filter(u => String(u.ReportingTo) === String(filter.branchCode))
        .map(u => String(u.branchCode));

      const managedBranches = [String(filter.branchCode), ...subordinateBranches];
      return assets.filter(a => managedBranches.includes(String(a.branchCode)));
    }

    // Branch User sees only their branch
    if (filter.branchCode) {
      // Check strict Code match OR Name match (since client side might pass code but Excel might have name mismatch or vice versa)
      // Actually filter.branchCode comes from the User object's branchCode.
      return assets.filter(a =>
        String(a.branchCode) === String(filter.branchCode) ||
        (a.branchName && a.branchName === String(filter.branchCode)) // edge case where code field is used for name?
      );
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
    const newAsset = { ...asset, id: newId };
    await this.addRow('assets.xlsx', 'Assets', newAsset);
    return newAsset as Asset;
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset> {
    const workbook = await this.getWorkbook('assets.xlsx');
    const sheet = workbook.getWorksheet('Assets');
    if (!sheet) throw new Error("Assets sheet not found");

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));
    const idColIdx = headers.indexOf('id');

    let targetRow: ExcelJS.Row | undefined;
    if (idColIdx > -1) {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (Number(row.getCell(idColIdx).value) === Number(id)) {
          targetRow = row;
        }
      });
    }

    if (!targetRow) {
      // Last resort: search every row
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowId = row.getCell(1).value; // Assume first col is ID if 'id' header not found
        if (Number(rowId) === Number(id)) targetRow = row;
      });
    }

    if (!targetRow) throw new Error(`Asset with ID ${id} not found`);

    Object.entries(updates).forEach(([key, value]) => {
      const colIdx = headers.indexOf(key);
      if (colIdx > -1) {
        targetRow!.getCell(colIdx).value = value as any;
      }
    });

    await this.saveWorkbook(workbook, 'assets.xlsx');
    const updatedAssets = await this.getAssets();
    const found = updatedAssets.find(a => a.id === id);
    if (!found) throw new Error("Failed to re-fetch updated asset");
    return found;
  }

  async deleteAsset(id: number): Promise<void> {
    console.log(`[Storage] Deleting asset with ID: ${id}`);
    const workbook = await this.getWorkbook('assets.xlsx');
    const sheet = workbook.getWorksheet('Assets');
    if (!sheet) {
      console.log(`[Storage] Assets sheet not found during delete`);
      return;
    }

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = String(cell.value));
    const idColIdx = headers.indexOf('id');
    console.log(`[Storage] Headers: ${JSON.stringify(headers)}, idColIdx: ${idColIdx}`);

    let rowToDelete: number | undefined;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cellValue = idColIdx > -1 ? row.getCell(idColIdx).value : row.getCell(1).value;

      // Match if numeric value matches or if string representation matches
      if (Number(cellValue) === Number(id) || String(cellValue) === String(id)) {
        rowToDelete = rowNumber;
      }
    });

    if (rowToDelete) {
      console.log(`[Storage] Deleting row number: ${rowToDelete}`);
      sheet.spliceRows(rowToDelete, 1);
      await this.saveWorkbook(workbook, 'assets.xlsx');
      console.log(`[Storage] Asset ${id} deleted successfully`);
    } else {
      console.log(`[Storage] Asset ${id} not found in sheet`);
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    const assets = await this.getAssets();
    const lowerQ = query.toLowerCase();
    return assets.filter(a =>
      a.name.toLowerCase().includes(lowerQ) ||
      a.tagNumber.toLowerCase().includes(lowerQ)
    );
  }

  // --- AUDIT ---

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const logs = await this.getAuditLogs();
    const newId = logs.length + 1;
    const newLog = { ...log, id: newId };
    await this.addRow('audit_logs.xlsx', 'Logs', newLog);
    return newLog as AuditLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.getSheetData<AuditLog>('audit_logs.xlsx', 'Logs');
  }

  // --- DASHBOARD ---

  async getDashboardStats(filter?: { role?: string; branchCode?: string }): Promise<any> {
    const assets = await this.getAssets(filter);
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    return {
      totalAssets: assets.length,
      expiringSoon: assets.filter(a => {
        // Check both warrantyEnd and amcEnd
        const warrantyExpiring = a.warrantyEnd && new Date(a.warrantyEnd) <= ninetyDaysFromNow && new Date(a.warrantyEnd) >= today;
        const amcExpiring = a.amcEnd && new Date(a.amcEnd) <= ninetyDaysFromNow && new Date(a.amcEnd) >= today;
        return warrantyExpiring || amcExpiring;
      }).length,
      amcDue: assets.filter(a => a.amcEnd && new Date(a.amcEnd) <= ninetyDaysFromNow && new Date(a.amcEnd) >= today).length,
      disposalPending: assets.filter(a => a.status === 'Pending Disposal').length,
      newAssets: assets.filter(a => {
        if (!a.purchaseDate) return false;
        const pDate = new Date(a.purchaseDate);
        const diffTime = Math.abs(today.getTime() - pDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }).length,
    };
  }

  async getExpiringAssets(filter?: { role?: string; branchCode?: string }): Promise<Asset[]> {
    const assets = await this.getAssets(filter);
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    return assets.filter(a => {
      const warrantyExpiring = a.warrantyEnd && new Date(a.warrantyEnd) <= ninetyDaysFromNow && new Date(a.warrantyEnd) >= today;
      const amcExpiring = a.amcEnd && new Date(a.amcEnd) <= ninetyDaysFromNow && new Date(a.amcEnd) >= today;
      return warrantyExpiring || amcExpiring;
    });
  }

  // --- GATE PASS ---
  async createGatePass(gp: any): Promise<GatePass> {
    const id = Math.floor(Math.random() * 10000);
    const newGP = { ...gp, id, passId: `GP-${id}` };
    await this.addRow('gatepass.xlsx', 'GatePasses', newGP);
    return newGP;
  }
}

export const storage = new ExcelStorage();

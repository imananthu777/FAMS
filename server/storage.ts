import { User, Asset, InsertUser, InsertAsset, AuditLog, InsertAuditLog, GatePass } from "@shared/schema";
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
    const sheet = workbook.getWorksheet(sheetName) || workbook.addWorksheet(sheetName);
    const data: T[] = [];
    
    // Assume first row is header
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.text;
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          item[header] = cell.value;
        }
      });
      // Simple ID handling if not present
      if (!item.id) item.id = rowNumber - 1;
      data.push(item as T);
    });
    return data;
  }

  private async addRow(filename: string, sheetName: string, data: any): Promise<any> {
    const workbook = await this.getWorkbook(filename);
    const sheet = workbook.getWorksheet(sheetName) || workbook.addWorksheet(sheetName);
    
    // Headers if empty
    if (sheet.rowCount === 0) {
      const headers = Object.keys(data);
      sheet.addRow(headers);
    }

    // Map data to columns based on header
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.text;
    });

    // Check if we need to add new headers
    Object.keys(data).forEach(key => {
        if (!headers.includes(key)) {
            const nextCol = headers.length > 0 ? headers.length : 1; 
            // In a real generic implementation we'd handle schema migration, 
            // but here we just append logic or assume fixed schema.
            // For simplicity, let's assume we just match existing or append.
        }
    });

    const rowValues: any[] = [];
    headers.forEach((header, index) => {
        if (index > 0) rowValues[index] = data[header];
    });

    // If headers didn't exist, we might have an issue mapping. 
    // Let's force a simple append if we are starting fresh.
    if (sheet.rowCount <= 1 && sheet.columnCount === 0) {
        // Setup headers from first record
        sheet.columns = Object.keys(data).map(k => ({ header: k, key: k }));
        sheet.addRow(data);
    } else {
        // Use key based adding
        sheet.addRow(data);
    }
    
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
    // Generate ID
    const users = await this.getUsers();
    const newId = users.length + 1;
    const newUser = { ...user, id: newId };
    await this.addRow('users.xlsx', 'Users', newUser);
    return newUser as User;
  }

  // --- ASSETS ---

  async getAssets(filter?: { role?: string; branchCode?: string }): Promise<Asset[]> {
    let assets = await this.getSheetData<Asset>('assets.xlsx', 'Assets');
    
    if (filter?.branchCode) {
      assets = assets.filter(a => a.branchCode === filter.branchCode);
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

    let targetRow: ExcelJS.Row | undefined;
    
    // Naive search by ID column (assuming ID is first or mapped)
    // We'll read headers to find ID col
    let idColIdx = -1;
    sheet.getRow(1).eachCell((cell, col) => {
        if (cell.text === 'id') idColIdx = col;
    });

    if (idColIdx === -1) {
        // Fallback: Use row index logic if we rely on it
        targetRow = sheet.getRow(id + 1); // +1 for header
    } else {
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            if (Number(row.getCell(idColIdx).value) === Number(id)) {
                targetRow = row;
            }
        });
    }

    if (!targetRow) throw new Error("Asset not found");

    // Update cells
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => headers[col] = cell.text);

    Object.entries(updates).forEach(([key, value]) => {
        const colIdx = headers.indexOf(key);
        if (colIdx > -1) {
            targetRow!.getCell(colIdx).value = value as any;
        }
    });

    await this.saveWorkbook(workbook, 'assets.xlsx');
    return { ...(await this.getAsset(id))! }; // Re-fetch to return full object
  }

  async deleteAsset(id: number): Promise<void> {
    // In Excel, maybe just mark as deleted or remove row. 
    // For now, let's just mark status as 'Disposed' if not already
    await this.updateAsset(id, { status: 'Disposed' });
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
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return {
      totalAssets: assets.length,
      expiringSoon: assets.filter(a => a.expiryDate && new Date(a.expiryDate) <= thirtyDaysFromNow).length,
      amcDue: assets.filter(a => a.amcEnd && new Date(a.amcEnd) <= thirtyDaysFromNow).length,
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

  // --- GATE PASS ---
  async createGatePass(gp: any): Promise<GatePass> {
     const id = Math.floor(Math.random() * 10000);
     const newGP = { ...gp, id, passId: `GP-${id}` };
     await this.addRow('gatepass.xlsx', 'GatePasses', newGP);
     return newGP;
  }
}

export const storage = new ExcelStorage();

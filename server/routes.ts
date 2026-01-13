import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth
  app.post(api.auth.login.path, async (req, res) => {
    const { username } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    // No real password check for demo
    res.json(user);
  });

  app.get(api.auth.users.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  // Assets
  app.get(api.assets.list.path, async (req, res) => {
    const { role, branchCode } = req.query as any;
    const assets = await storage.getAssets({ role, branchCode });
    res.json(assets);
  });

  app.get(api.assets.get.path, async (req, res) => {
    const asset = await storage.getAsset(Number(req.params.id));
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  });

  app.post(api.assets.create.path, async (req, res) => {
    try {
      const asset = await storage.createAsset(req.body);
      
      // Audit Log
      await storage.createAuditLog({
        timestamp: new Date().toISOString(),
        user: req.body.branchUser || 'System',
        action: 'Created Asset',
        assetId: String(asset.id),
        remarks: `Created ${asset.name}`
      });

      res.status(201).json(asset);
    } catch (e) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.put(api.assets.update.path, async (req, res) => {
    try {
      const asset = await storage.updateAsset(Number(req.params.id), req.body);
      
      // Audit Log
      await storage.createAuditLog({
        timestamp: new Date().toISOString(),
        user: 'System', // Should be from auth context
        action: 'Updated Asset',
        assetId: String(asset.id),
        remarks: `Updated ${asset.name}`
      });

      res.json(asset);
    } catch (e) {
      res.status(404).json({ message: "Asset not found or invalid data" });
    }
  });

  app.get(api.assets.search.path, async (req, res) => {
      const q = req.query.q as string;
      if (!q) return res.json([]);
      const results = await storage.searchAssets(q);
      res.json(results);
  });

  // Dashboard
  app.get(api.dashboard.stats.path, async (req, res) => {
    const { role, branchCode } = req.query as any;
    const stats = await storage.getDashboardStats({ role, branchCode });
    res.json(stats);
  });

  // Audit
  app.get(api.audit.list.path, async (req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  // Gatepass
  app.post(api.gatepass.create.path, async (req, res) => {
      const gp = await storage.createGatePass({
          ...req.body,
          generatedAt: new Date().toISOString(),
          status: 'Active'
      });
      res.status(201).json(gp);
  });

  // Seed Function
  const seedData = async () => {
    const users = await storage.getUsers();
    if (users.length === 0) {
      await storage.createUser({ username: "admin", password: "123", role: "Admin", branchCode: "HQ" });
      await storage.createUser({ username: "manager", password: "123", role: "Manager", branchCode: "HQ" });
      await storage.createUser({ username: "branch1", password: "123", role: "Branch User", branchCode: "BR001" });
    }
    
    const assets = await storage.getAssets();
    if (assets.length === 0) {
      await storage.createAsset({
        name: "MacBook Pro M1",
        type: "Laptop",
        tagNumber: "TAG-001",
        purchaseDate: "2024-01-15",
        warrantyEnd: "2025-01-15",
        branchName: "New York HQ",
        branchCode: "HQ",
        branchUser: "admin",
        status: "Active",
        mappedEmployee: "EMP001"
      });
      await storage.createAsset({
        name: "Office Chair",
        type: "Furniture",
        tagNumber: "TAG-002",
        purchaseDate: "2023-06-01",
        warrantyEnd: "2026-06-01",
        branchName: "New York HQ",
        branchCode: "HQ",
        branchUser: "admin",
        status: "Active",
        mappedEmployee: "EMP002"
      });
    }
  };

  await seedData();

  return httpServer;
}

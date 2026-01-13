import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Although we are using Excel, we define these for type consistency
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tagNumber: text("tag_number").notNull().unique(),
  purchaseDate: text("purchase_date").notNull(), // ISO Date string
  warrantyEnd: text("warranty_end"),
  amcStart: text("amc_start"),
  amcEnd: text("amc_end"),
  expiryDate: text("expiry_date"),
  depreciationMethod: text("depreciation_method"),
  depreciationRate: integer("depreciation_rate"),
  closingValue: integer("closing_value"),
  branchName: text("branch_name").notNull(),
  branchCode: text("branch_code").notNull(),
  branchUser: text("branch_user").notNull(),
  status: text("status").notNull().default("Active"), // Active, Pending Approval, Disposal, Disposed
  mappedEmployee: text("mapped_employee"),
  custodian: text("custodian"), // Usually same as mappedEmployee or Branch User
  imageUrl: text("image_url"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'Branch User', 'Manager', 'Admin'
  branchCode: text("branch_code"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  user: text("user").notNull(),
  action: text("action").notNull(),
  assetId: text("asset_id"),
  remarks: text("remarks"),
});

export const gatePasses = pgTable("gate_passes", {
  id: serial("id").primaryKey(),
  passId: text("pass_id").notNull(),
  assetId: text("asset_id").notNull(),
  fromBranch: text("from_branch").notNull(),
  toBranch: text("to_branch").notNull(),
  generatedBy: text("generated_by").notNull(),
  generatedAt: text("generated_at").notNull(),
  status: text("status").notNull(),
});

// Schemas
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export const insertGatePassSchema = createInsertSchema(gatePasses).omit({ id: true });

// Types
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type GatePass = typeof gatePasses.$inferSelect;

export type LoginRequest = { username: string }; // Simplified login

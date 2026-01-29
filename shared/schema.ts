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
  // Workflow fields
  amcWarranty: text("amc_warranty"),
  transferStatus: text("transfer_status"),
  toLocation: text("to_location"),
  gatePassType: text("gate_pass_type"),
  initiatedBy: text("initiated_by"),
  initiatedAt: text("initiated_at"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  reason: text("reason"),
  purpose: text("purpose"),
  generatedBy: text("generated_by"),
  generatedAt: text("generated_at"),
  rejectionReason: text("rejection_reason"),
  rejectedBy: text("rejected_by"),
  rejectedAt: text("rejected_at"),
  fromBranch: text("from_branch"),
  fromBranchCode: text("from_branch_code"),
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

// Roles (Dynamic Role Management)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // "HO", "Admin", "Manager", "Branch User"
  description: text("description"),
  // Asset Management Permissions
  assetCreation: text("asset_creation").default("false"),
  assetModification: text("asset_modification").default("false"),
  assetDeletion: text("asset_deletion").default("false"),
  assetConfirmation: text("asset_confirmation").default("false"),
  // Disposal Workflow
  initiateDisposal: text("initiate_disposal").default("false"),
  approveDisposal: text("approve_disposal").default("false"),
  // Transfer Workflow
  initiateTransfer: text("initiate_transfer").default("false"),
  approveTransfer: text("approve_transfer").default("false"),
  // Payables
  createAgreement: text("create_agreement").default("false"),
  approveAgreement: text("approve_agreement").default("false"),
  createBill: text("create_bill").default("false"),
  approveBill: text("approve_bill").default("false"),
  // Role Management (HO only)
  manageRoles: text("manage_roles").default("false"),
});

// Payables - Agreements
export const agreements = pgTable("agreements", {
  id: serial("id").primaryKey(),
  contractId: text("contract_id").notNull().unique(),
  type: text("type"),
  vendorName: text("vendor_name"),
  billType: text("bill_type"),
  branchCode: text("branch_code").notNull(),
  agreementDate: text("agreement_date"),
  renewalDate: text("renewal_date"),
  amount: integer("amount"),
  description: text("description"),
  status: text("status").default("Active"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

// Payables - Bills
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNo: text("bill_no").notNull(),
  branchCode: text("branch_code").notNull(),
  billType: text("bill_type").notNull(),
  vendorId: text("vendor_id"),
  vendorName: text("vendor_name"),
  contractId: text("contract_id"),
  amount: integer("amount").notNull(),
  billDate: text("bill_date").notNull(),
  monthYear: text("month_year"),
  billedFromDate: text("billed_from_date"),
  billedToDate: text("billed_to_date"),
  billedToWhom: text("billed_to_whom"),
  dueDate: text("due_date"),
  priority: text("priority"),
  modeOfPayment: text("mode_of_payment"),
  utrNumber: text("utr_number"),
  paymentDate: text("payment_date"),
  paymentStatus: text("payment_status").default("Unpaid"),
  paymentScheduledDate: text("payment_scheduled_date"),
  isException: text("is_exception").default("No"),
  exceptionReason: text("exception_reason"),
  // Approval workflow fields
  approvalStatus: text("approval_status").notNull().default("Pending"),
  approverID: integer("approver_id"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdBy: text("created_by"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  role: text("role"),
  branchCode: text("branch_code"),
  isRead: text("is_read").default("false"),
  createdAt: text("created_at").notNull(),
  assetId: text("asset_id"),
  createdBy: text("created_by"),
  targetRole: text("target_role"),
  targetBranch: text("target_branch"),
  targetUsername: text("target_username"),
});

// Schemas
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export const insertGatePassSchema = createInsertSchema(gatePasses).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export const insertAgreementSchema = createInsertSchema(agreements).omit({ id: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });

// Types
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type GatePass = typeof gatePasses.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Agreement = typeof agreements.$inferSelect;
export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type LoginRequest = { username: string }; // Simplified login

import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertAgreementSchema, insertBillSchema, insertAssetSchema, insertRoleSchema, User } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Disable caching for all API routes to ensure fresh data
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });

  // --- AUTH ---
  app.post(api.auth.login.path, async (req, res) => {
    const { username } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    // No real password check for demo/MVP as requested
    res.json(user);
  });

  app.get(api.auth.users.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  // Get current user info - useful for role checks on frontend
  app.get('/api/user', async (req, res) => {
    if ((req as any).user) {
      res.json((req as any).user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // --- ROLES ---
  app.get('/api/roles', async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post('/api/roles', async (req, res) => {
    try {
      // Security check: Only HO can create roles
      // In a real app we'd check req.user.role === 'HO' or has permission
      const data = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(data);
      res.status(201).json(role);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid role data" });
    }
  });

  app.put('/api/roles/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(id, data);
      res.json(role);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to update role" });
    }
  });

  // Approval workflow endpoints

  // Get pending bills for approval (for current user as approver)
  app.get('/api/payables/pending-approvals', async (req, res) => {
    try {
      const { userId, role, branchCode } = req.query as any;

      if (!userId && !role) {
        return res.status(400).json({ message: "userId or role required" });
      }

      // If userId provided, use it directly
      if (userId) {
        const bills = await storage.getPendingBillsForApprover(parseInt(userId));
        res.json(bills);
      } else {
        // Use role-based filtering
        const allBills = await storage.getBillsForRole({ role, branchCode });
        const pendingBills = allBills.filter(b => b.approvalStatus === 'Pending' && b.paymentStatus !== 'Paid');
        res.json(pendingBills);
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch pending approvals" });
    }
  });

  // Approve a bill
  app.post('/api/payables/bills/:id/approve', async (req, res) => {
    try {
      const { username, userId } = req.body;

      if (!username || !userId) {
        return res.status(400).json({ message: "username and userId required" });
      }

      const billId = parseInt(req.params.id);
      const bill = await storage.approveBill(billId, username, parseInt(userId));

      // Notify the creator
      if (bill.createdBy) {
        await storage.createNotification({
          title: "Bill Approved",
          message: `Your bill #${bill.billNo} has been approved by ${username}.`,
          type: "success",
          targetUsername: bill.createdBy,
          isRead: "false",
          createdAt: new Date().toISOString()
        });
      }

      res.json(bill);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to approve bill" });
    }
  });

  // Reject a bill
  app.post('/api/payables/bills/:id/reject', async (req, res) => {
    try {
      const { username, userId, reason } = req.body;

      if (!username || !userId) {
        return res.status(400).json({ message: "username and userId required" });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const billId = parseInt(req.params.id);
      const bill = await storage.rejectBill(billId, username, reason, parseInt(userId));

      // Notify the creator
      if (bill.createdBy) {
        await storage.createNotification({
          title: "Bill Rejected",
          message: `Your bill #${bill.billNo} has been rejected by ${username}. Reason: ${reason}`,
          type: "error",
          targetUsername: bill.createdBy,
          isRead: "false",
          createdAt: new Date().toISOString()
        });
      }

      res.json(bill);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to reject bill" });
    }
  });

  // Get pending actions count for dashboard
  app.get('/api/dashboard/pending-actions', async (req, res) => {
    try {
      const { userId, role, branchCode } = req.query as any;

      if (!userId && !role) {
        return res.status(400).json({ message: "userId or role required" });
      }

      if (userId) {
        const count = await storage.getPendingActionsCount(parseInt(userId));
        res.json({ pendingBills: count });
      } else {
        const allBills = await storage.getBillsForRole({ role, branchCode });
        const count = allBills.filter(b => b.approvalStatus === 'Pending' && b.paymentStatus !== 'Paid').length;
        res.json({ pendingBills: count });
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch pending actions" });
    }
  });

  // --- ASSETS ---
  app.get(api.assets.list.path, async (req, res) => {
    try {
      const { role, branchCode } = req.query as any;
      const assets = await storage.getAssets({ role, branchCode });
      res.json(assets);
    } catch (e: any) {
      console.error('Error fetching assets:', e);
      res.status(500).json({ message: e.message || "Failed to fetch assets" });
    }
  });

  app.get(api.assets.get.path, async (req, res) => {
    const asset = await storage.getAsset(Number(req.params.id));
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  });

  app.post(api.assets.create.path, async (req, res) => {
    try {
      const asset = await storage.createAsset(req.body);
      // Optional: Audit log here if we implemented it, or notification
      res.status(201).json(asset);
    } catch (e) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.put(api.assets.update.path, async (req, res) => {
    try {
      const asset = await storage.updateAsset(Number(req.params.id), req.body);
      res.json(asset);
    } catch (e) {
      res.status(404).json({ message: "Asset not found or invalid data" });
    }
  });

  app.delete(api.assets.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteAsset(id);
    res.status(204).end();
  });

  app.get(api.assets.search.path, async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const results = await storage.searchAssets(q);
    res.json(results);
  });

  // --- ASSET WORKFLOWS (Transfer/Disposal) ---

  // Initiate Transfer
  app.post('/api/assets/:id/transfer/initiate', async (req, res) => {
    const id = Number(req.params.id);
    const { toLocation, reason, initiatedBy } = req.body;

    try {
      const asset = await storage.updateAsset(id, {
        status: 'TransferApprovalPending',
        toLocation, // This acts as the target branch code for transfer
        reason,
        initiatedBy,
        initiatedAt: new Date().toISOString(),
        gatePassType: 'Transfer',
        purpose: 'Transfer'
      });

      // Notify Admin/HO and Target Branch about transfer
      await storage.createNotification({
        title: "Transfer Initiated",
        message: `${asset.name} is being transferred from ${asset.branchCode} to ${toLocation}. Pending approval.`,
        type: "info",
        targetRole: "Admin",
        targetBranch: toLocation,
        isRead: "false",
        createdAt: new Date().toISOString()
      });

      res.json(asset);
    } catch (e) {
      res.status(500).json({ message: "Failed to initiate transfer" });
    }
  });

  // Approve Transfer
  app.post('/api/assets/:id/transfer/approve', async (req, res) => {
    const id = Number(req.params.id);
    const { approvedBy } = req.body;

    try {
      const asset = await storage.approveAssetTransfer(id, approvedBy);

      // Notify the initiator
      if (asset.initiatedBy) {
        await storage.createNotification({
          title: "Transfer Approved",
          message: `The transfer for asset ${asset.name} has been approved.`,
          type: "success",
          targetUsername: asset.initiatedBy,
          isRead: "false",
          createdAt: new Date().toISOString()
        });
      }

      res.json(asset);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to approve transfer" });
    }
  });

  // Temporary Gate Pass
  app.post('/api/assets/:id/gatepass', async (req, res) => {
    const id = Number(req.params.id);
    const { toLocation, reason, purpose, generatedBy } = req.body;
    try {
      const asset = await storage.updateAsset(id, {
        status: 'GatePass',
        gatePassType: 'Temporary',
        toLocation,
        reason,
        purpose,
        generatedBy,
        generatedAt: new Date().toISOString()
      });

      // Notify Admin/HO about gate pass
      await storage.createNotification({
        title: "Gate Pass Generated",
        message: `A temporary gate pass for ${asset.name} has been generated by ${generatedBy || 'a user'}. Destination: ${toLocation}.`,
        type: "info",
        targetRole: "Admin",
        isRead: "false",
        createdAt: new Date().toISOString()
      });

      res.json(asset);
    } catch (e) {
      res.status(500).json({ message: "Failed to create gate pass" });
    }
  });

  // Get Pending Transfers count (TransferApprovalPending)
  app.get('/api/transfers/pending', async (req, res) => {
    const { role, branchCode } = req.query as any;
    // Logic:
    // If Admin/Manager: All pending? Or only those affecting their branches?
    // "Admin/Manager should see count of transfers waiting approval"
    // Usually transfers are approved by Admin/Manager.
    // If Branch User: See count of incoming? "Transfers Actionable" usually means "Waiting for MY action".
    // Branch User: Maybe incoming transfers? But approval is usually upper level.
    // Let's reuse Asset filtering.

    const assets = await storage.getAssets({ role, branchCode });
    // Count 'TransferApprovalPending'
    // If role is Manager/Admin: They see TransferApprovalPending in their scope (filtered by getAssets)
    // If role is Branch: They might see it if they initiated it? Or if it's incoming?
    // "Transfer Actionable" -> Approval Pending.
    const count = assets.filter(a => a.status === 'TransferApprovalPending').length;

    res.json({ count });
  });

  // Initiate Disposal
  app.post('/api/assets/:id/disposal/initiate', async (req, res) => {
    const id = Number(req.params.id);
    const { reason, initiatedBy } = req.body;
    try {
      const asset = await storage.updateAsset(id, {
        status: 'DisposalInitiated',
        reason,
        initiatedBy,
        initiatedAt: new Date().toISOString()
      });
      res.json(asset);
    } catch (e) {
      res.status(500).json({ message: "Failed to initiate disposal" });
    }
  });

  // Approve Disposal
  app.post('/api/assets/:id/disposal/approve', async (req, res) => {
    const id = Number(req.params.id);
    const { approvedBy } = req.body;
    try {
      const asset = await storage.updateAsset(id, {
        status: 'Disposed',
        approvedBy,
        approvedAt: new Date().toISOString()
      });

      // Notify the initiator
      if (asset.initiatedBy) {
        await storage.createNotification({
          title: "Disposal Approved",
          message: `The disposal request for ${asset.name} has been approved.`,
          type: "success",
          targetUsername: asset.initiatedBy,
          isRead: "false",
          createdAt: new Date().toISOString()
        });
      }

      res.json(asset);
    } catch (e) {
      res.status(500).json({ message: "Failed to approve disposal" });
    }
  });

  // --- PAYABLES ---

  app.get('/api/payables/agreements', async (req, res) => {
    try {
      const { branchCode, role } = req.query as any;
      // Use role-based filtering if role is provided
      if (role) {
        const items = await storage.getAgreementsForRole({ role, branchCode });
        res.json(items);
      } else {
        const items = await storage.getAgreements({ branchCode });
        res.json(items);
      }
    } catch (e: any) {
      console.error('Error fetching agreements:', e);
      res.status(500).json({ message: e.message || "Failed to fetch agreements" });
    }
  });

  app.post('/api/payables/agreements', async (req, res) => {
    try {
      const data = insertAgreementSchema.parse(req.body);
      const item = await storage.createAgreement(data);
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json({ message: "Invalid agreement data", error: e });
    }
  });

  app.get('/api/payables/bills', async (req, res) => {
    try {
      const { branchCode, role } = req.query as any;
      // Use role-based filtering if role is provided
      if (role) {
        const items = await storage.getBillsForRole({ role, branchCode });
        res.json(items);
      } else {
        const items = await storage.getBills({ branchCode });
        res.json(items);
      }
    } catch (e: any) {
      console.error('Error fetching bills:', e);
      res.status(500).json({ message: e.message || "Failed to fetch bills" });
    }
  });

  app.post('/api/payables/bills', async (req, res) => {
    try {
      // Pass createdBy explicitly if it's in the body but not in the standard schema validation
      const data = {
        ...insertBillSchema.parse(req.body),
        createdBy: req.body.createdBy
      };
      const item = await storage.createBill(data as any);

      // Notify Admin/HO about new bill
      await storage.createNotification({
        title: "New Bill Raised",
        message: `A new bill #${item.billNo} for ₹${item.amount?.toLocaleString()} has been raised by ${item.createdBy || 'a user'}.`,
        type: "info",
        targetRole: "Admin",
        isRead: "false",
        createdAt: new Date().toISOString()
      });

      res.status(201).json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid bill data" });
    }
  });

  // Pay a bill (Admin/HO only)
  app.post('/api/payables/bills/:id/pay', async (req, res) => {
    try {
      const { paidBy, modeOfPayment, utrNumber, paymentDate } = req.body;

      if (!paidBy || !modeOfPayment || !utrNumber) {
        return res.status(400).json({ message: "paidBy, modeOfPayment, and utrNumber required" });
      }

      const billId = parseInt(req.params.id);
      const bill = await storage.payBill(billId, paidBy, modeOfPayment, utrNumber, paymentDate);

      // Notify the creator
      if (bill.createdBy) {
        await storage.createNotification({
          title: "Bill Paid",
          message: `Your bill #${bill.billNo} has been paid via ${modeOfPayment}. UTR: ${utrNumber}`,
          type: "success",
          targetUsername: bill.createdBy,
          isRead: "false",
          createdAt: new Date().toISOString()
        });
      }

      res.json(bill);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to pay bill" });
    }
  });

  // Update Bill Status (Generic - for Finance, Postpone)
  app.put('/api/payables/bills/:id/status', async (req, res) => {
    try {
      const { status, remarks, updatedBy, ...extras } = req.body;
      if (!status) return res.status(400).json({ message: "Status required" });

      const billId = parseInt(req.params.id);
      const bill = await storage.updateBillStatus(billId, status, remarks, updatedBy, extras);
      res.json(bill);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to update bill status" });
    }
  });

  // Get all unpaid bills (Admin/HO view)
  app.get('/api/payables/unpaid-bills', async (req, res) => {
    try {
      const bills = await storage.getUnpaidBills();
      res.json(bills);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch unpaid bills" });
    }
  });

  // New endpoints for Payables redesign

  // Get bills for specific agreement (transaction history)
  app.get('/api/agreements/:contractId/bills', async (req, res) => {
    try {
      const { contractId } = req.params;
      const bills = await storage.getBillsByContract(contractId);
      res.json(bills);
    } catch (e: any) {
      console.error('Error fetching bills for contract:', e);
      res.status(500).json({ message: e.message || "Failed to fetch bills" });
    }
  });

  // Validate bill before creation
  app.post('/api/bills/validate', async (req, res) => {
    try {
      const { contractId, amount, billDate, monthYear } = req.body;

      // Get agreement
      const agreement = await storage.getAgreementByContractId(contractId);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }

      // Validation checks
      const { isWithin90Days, getMonthYear } = await import('../shared/payables-utils');

      const dateValid = isWithin90Days(billDate);
      const amountValid = amount <= (agreement.amount || 0);

      // Check monthly limit for monthly bills
      const currentMonthTotal = await storage.getMonthlyBillTotal(contractId, monthYear);
      const monthlyLimitValid = (currentMonthTotal + amount) <= (agreement.amount || 0);

      res.json({
        dateValid,
        amountValid,
        monthlyLimitValid,
        needsException: !amountValid || !monthlyLimitValid,
        currentMonthTotal,
        agreementAmount: agreement.amount,
      });
    } catch (e: any) {
      console.error('Error validating bill:', e);
      res.status(500).json({ message: e.message || "Validation failed" });
    }
  });

  // --- DASHBOARD & NOTIFICATIONS ---

  app.get(api.dashboard.stats.path, async (req, res) => {
    try {
      const { role, branchCode } = req.query as any;
      const stats = await storage.getDashboardStats({ role, branchCode });
      res.json(stats);
    } catch (e: any) {
      console.error('Error fetching dashboard stats:', e);
      res.status(500).json({ message: e.message || "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/expiring', async (req, res) => {
    const { role, branchCode } = req.query as any;
    // We can reuse getAssets logic and filter manually or add method
    // Reuse filter logic client side or simple implementation:
    const assets = await storage.getAssets({ role, branchCode });
    const today = new Date();
    const ninetyDays = new Date();
    ninetyDays.setDate(today.getDate() + 90);

    // Filter expiring warranty or AMC
    const expiring = assets.filter(a => {
      // If has AMC end
      if (a.amcEnd) {
        const d = new Date(a.amcEnd);
        if (d >= today && d <= ninetyDays) return true;
      }
      // If has Warranty end and NO AMC
      if (a.warrantyEnd && a.amcWarranty !== 'AMC') {
        const d = new Date(a.warrantyEnd);
        if (d >= today && d <= ninetyDays) return true;
      }
      return false;
    });
    res.json(expiring);
  });

  // --- DISPOSAL WORKFLOW ADAPTERS ---
  // These support the Disposals.tsx UI but store data in Assets.xlsx

  app.get('/api/disposals', async (req, res) => {
    const { status, branchCode, role } = req.query as any;
    // Get all assets that are in a disposal flow
    let assets = await storage.getAssets({ role, branchCode });

    const disposalStatuses = ['In Cart', 'Pending', 'Recommended', 'Approved', 'Disposed', 'Pending Disposal', 'DisposalInitiated'];

    let disposals = assets.filter(a => disposalStatuses.includes(a.status)).map(a => ({
      id: a.id,
      assetId: a.id, // For UI compatibility
      status: a.status === 'DisposalInitiated' ? 'In Cart' : (a.status === 'Pending Disposal' ? 'Pending' : a.status), // Normalize
      initiatedBy: a.initiatedBy,
      initiatedAt: a.initiatedAt,
      reason: a.reason,
      approvedBy: a.approvedBy,
      approvedAt: a.approvedAt
    }));

    res.json(disposals);
  });

  app.put('/api/disposals/:id/submit', async (req, res) => {
    // Submit from Cart to Pending
    const asset = await storage.updateAsset(Number(req.params.id), { status: 'Pending' });

    // Notify Admin/HO about new disposal pending
    await storage.createNotification({
      title: "Disposal Pending",
      message: `A new disposal request for ${asset.name} has been submitted and is pending approval.`,
      type: "info",
      targetRole: "Admin",
      isRead: "false",
      createdAt: new Date().toISOString()
    });

    res.json(asset);
  });

  app.put('/api/disposals/:id/recommend', async (req, res) => {
    const asset = await storage.updateAsset(Number(req.params.id), { status: 'Recommended' });

    // Notify the initiator
    if (asset.initiatedBy) {
      await storage.createNotification({
        title: "Disposal Recommended",
        message: `Your disposal request for ${asset.name} has been recommended for final approval.`,
        type: "success",
        targetUsername: asset.initiatedBy,
        isRead: "false",
        createdAt: new Date().toISOString()
      });
    }

    res.json(asset);
  });

  app.put('/api/disposals/:id/reject', async (req, res) => {
    // Return to Cart
    const asset = await storage.updateAsset(Number(req.params.id), { status: 'In Cart' });

    // Notify the initiator
    if (asset.initiatedBy) {
      await storage.createNotification({
        title: "Disposal Rejected",
        message: `Your disposal request for ${asset.name} has been sent back to cart for review.`,
        type: "error",
        targetUsername: asset.initiatedBy,
        isRead: "false",
        createdAt: new Date().toISOString()
      });
    }

    res.json(asset);
  });

  app.delete('/api/disposals/:id', async (req, res) => {
    // Cancel disposal -> Active
    const asset = await storage.updateAsset(Number(req.params.id), { status: 'Active' });
    res.json({ success: true });
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', async (req, res) => {
    const { role, branchCode, username } = req.query as any;
    const items = await storage.getNotifications({ role, branchCode, username });
    res.json(items);
  });

  app.post('/api/notifications', async (req, res) => {
    const item = await storage.createNotification({
      ...req.body,
      createdAt: new Date().toISOString(),
      isRead: 'false'
    });
    res.status(201).json(item);
  });

  // Seed (Optional, minimal)
  const seedData = async () => {
    const users = await storage.getUsers();
    if (users.length === 0) {
      await storage.createUser({
        username: "admin", password: "123", role: "Admin", branchCode: "HO"
      });
      console.log("Seeded Admin user");
    }
  };
  await seedData();

  return httpServer;
}

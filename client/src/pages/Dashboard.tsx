import { useDashboardStats, useExpiringAssets } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, Trash2, Box, Bell, ArrowRightLeft, Wallet, FileText, CheckCircle, XCircle, Eye, CreditCard, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useUnpaidBills, useBillsForRole, usePendingBillsForApproval, useApproveBill, useRejectBill, usePayBill } from "@/hooks/use-payables";
import { useAssets, useApproveTransfer, useUpdateAsset } from "@/hooks/use-assets";
import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import type { Asset } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats(
    user?.role || undefined,
    user?.branchCode || undefined
  );
  const { data: expiringAssets, refetch: fetchExpiringAssets, isLoading: isLoadingExpiring } = useExpiringAssets(
    user?.role || undefined,
    user?.branchCode || undefined
  );
  const { data: notifications, isLoading: isLoadingNotifications } = useNotifications(
    user?.role || undefined,
    user?.branchCode || undefined,
    user?.username || undefined
  );

  const { data: unpaidBills } = useUnpaidBills();
  const { data: branchBills } = useBillsForRole(
    user?.role === 'Branch User' ? 'Branch User' : undefined,
    user?.branchCode || undefined
  );

  const { data: pendingBills } = usePendingBillsForApproval(
    user?.role || undefined,
    user?.branchCode || undefined
  );

  const approveBill = useApproveBill();
  const rejectBill = useRejectBill();
  const payBill = usePayBill();

  const { data: allAssetsForAdmin } = useAssets(
    (user?.role === 'Admin' || user?.role === 'HO') ? { role: 'Admin' } : undefined
  );

  const pendingTransfers = useMemo(() => {
    if (!allAssetsForAdmin) return [];
    return allAssetsForAdmin.filter(a => a.status === 'TransferApprovalPending');
  }, [allAssetsForAdmin]);

  const approveTransfer = useApproveTransfer();
  const updateAsset = useUpdateAsset();

  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedBillDetails, setSelectedBillDetails] = useState<any>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBillForReject, setSelectedBillForReject] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [transfersCount, setTransfersCount] = useState(0);
  const [showExpiring, setShowExpiring] = useState(false);

  const payablesSummary = useMemo(() => {
    let billsToCount = [];
    if (user?.role === 'Admin' || user?.role === 'HO') {
      billsToCount = unpaidBills || [];
    } else {
      billsToCount = branchBills || [];
    }

    const overdue = billsToCount.filter((b: any) => {
      const dueDate = new Date(b.dueDate || b.billDate);
      return dueDate < new Date() && b.paymentStatus !== 'Paid';
    }).length;

    const pending = billsToCount.filter((b: any) => b.paymentStatus !== 'Paid').length;
    const paid = billsToCount.filter((b: any) => b.paymentStatus === 'Paid').length;

    return { overdue, pending, paid };
  }, [unpaidBills, branchBills, user]);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const params = new URLSearchParams();
        if (user?.role) params.append('role', user.role);
        if (user?.branchCode) params.append('branchCode', user.branchCode);
        const res = await fetch(`/api/transfers/pending?${params.toString()}`);
        const data = await res.json();
        setTransfersCount(data.count || 0);
      } catch (e) {
        console.error('Failed to fetch transfers:', e);
      }
    };
    fetchTransfers();
  }, [user]);

  const handleExpiringClick = () => {
    setShowExpiring(!showExpiring);
    if (!showExpiring) {
      fetchExpiringAssets();
    }
  };

  const handleNotify = async (asset: Asset) => {
    try {
      await Promise.all([
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'expiring_asset',
            title: 'Asset Warranty/AMC Expiring',
            message: `Asset "${asset.name}" (${asset.tagNumber}) warranty/AMC is expiring soon`,
            assetId: String(asset.id),
            createdBy: user?.username || 'System',
            targetRole: 'Manager',
            targetBranch: asset.branchCode,
          })
        }),
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'expiring_asset',
            title: 'Asset Warranty/AMC Expiring',
            message: `Asset "${asset.name}" (${asset.tagNumber}) warranty/AMC is expiring soon`,
            assetId: String(asset.id),
            createdBy: user?.username || 'System',
            targetRole: 'Admin',
            targetBranch: 'HO',
          })
        })
      ]);
      alert(`Notifications sent for ${asset.name}!`);
    } catch (e) {
      alert('Failed to send notifications');
    }
  };

  const calculatePriority = (bill: any) => {
    const targetDateStr = bill.dueDate || bill.billDate;
    if (!targetDateStr) return { priority: 'Upcoming', color: 'bg-green-100 text-green-700' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      return { priority: 'Overdue', color: 'bg-red-50 text-red-600' };
    } else if (targetDate.getTime() === today.getTime()) {
      return { priority: 'Due Today', color: 'bg-orange-50 text-orange-600' };
    } else {
      return { priority: 'Upcoming', color: 'bg-emerald-50 text-emerald-600' };
    }
  };

  const handlePayBillConfirm = async () => {
    if (!user || !selectedBillForPay || !paymentMode) return;
    await payBill.mutateAsync({
      billId: selectedBillForPay.id,
      paidBy: user.username,
      modeOfPayment: paymentMode,
      utrNumber: utrNumber,
      paymentDate: paymentDate || new Date().toISOString()
    });
    setPayDialogOpen(false);
    setSelectedBillForPay(null);
    setPaymentMode('');
    setUtrNumber('');
    setPaymentDate('');
    setViewDetailsOpen(false);
  };

  const handleApproveTransfer = async (asset: Asset) => {
    if (!user) return;
    await approveTransfer.mutateAsync({
      id: asset.id,
      approvedBy: user.username
    });
  };

  const handleRejectTransfer = async (asset: Asset) => {
    if (!user) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    await updateAsset.mutateAsync({
      id: asset.id,
      status: 'Active',
      transferStatus: 'Rejected',
      rejectionReason: reason as any,
      rejectedBy: user.username as any,
      rejectedAt: new Date().toISOString() as any
    });
  };

  const handleApproveBill = async (bill: any) => {
    if (!user) return;
    await approveBill.mutateAsync({
      billId: bill.id,
      username: user.username,
      userId: user.id
    });
    setViewDetailsOpen(false);
  };

  const handleRejectBill = async () => {
    if (!user || !selectedBillForReject || !rejectionReason.trim()) return;
    await rejectBill.mutateAsync({
      billId: selectedBillForReject.id,
      username: user.username,
      userId: user.id,
      reason: rejectionReason
    });
    setRejectDialogOpen(false);
    setSelectedBillForReject(null);
    setRejectionReason('');
    setViewDetailsOpen(false);
  };

  const openRejectDialog = (bill: any) => {
    setSelectedBillForReject(bill);
    setRejectDialogOpen(true);
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-10 pb-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Welcome Liquid Card */}
            <div className="liquid-glass rounded-[3rem] p-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-transparent opacity-50" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                  <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                    Welcome back, <span className="text-primary">{user?.username}</span>
                  </h2>
                  <p className="text-base font-medium text-gray-600 leading-relaxed max-w-lg">
                    System status is <span className="text-emerald-600 font-bold">Optimal</span>. You have {notifications?.filter((n: any) => n.isRead === 'false').length || 0} alerts and {payablesSummary.overdue} pending items requiring immediate attention.
                  </p>
                </div>
                <div className="flex -space-x-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-14 h-14 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-gray-400 shadow-xl overflow-hidden">
                      <UserCircle className="w-10 h-10" />
                    </div>
                  ))}
                  <div className="w-14 h-14 rounded-full border-4 border-white bg-primary flex items-center justify-center text-white text-xs font-bold shadow-xl">
                    +12
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Actions Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Bills Widget */}
              {(user?.role === 'Admin' || user?.role === 'HO') && pendingBills && pendingBills.length > 0 && (
                <div className="liquid-glass rounded-[2.5rem] p-8 border-orange-100 shadow-orange-500/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                        <Wallet className="text-orange-600 w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Pending Bills</h3>
                    </div>
                    <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                      {pendingBills.length} Needs Approval
                    </span>
                  </div>
                  <div className="space-y-4">
                    {pendingBills.slice(0, 3).map((bill: any) => (
                      <div key={bill.id} className="glossy-card rounded-2xl p-4 flex items-center justify-between group">
                        <div>
                          <p className="text-sm font-bold text-gray-900">₹{bill.amount?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">{bill.vendorName}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-10 h-10 rounded-xl hover:bg-white active:scale-90"
                          onClick={() => {
                            setSelectedBillDetails(bill);
                            setViewDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfers Widget */}
              {(user?.role === 'Admin' || user?.role === 'HO') && pendingTransfers.length > 0 && (
                <div className="liquid-glass rounded-[2.5rem] p-8 border-indigo-100 shadow-indigo-500/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                        <ArrowRightLeft className="text-primary w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Transfers</h3>
                    </div>
                    <span className="bg-primary text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                      {pendingTransfers.length} Actionable
                    </span>
                  </div>
                  <div className="space-y-4">
                    {pendingTransfers.slice(0, 3).map((asset: any) => (
                      <div key={asset.id} className="glossy-card rounded-2xl p-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{asset.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">{asset.branchCode} → {asset.toLocation}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 rounded-lg hover:bg-emerald-50 text-emerald-600 active:scale-90"
                            onClick={() => handleApproveTransfer(asset)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-600 active:scale-90"
                            onClick={() => handleRejectTransfer(asset)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modern Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glossy-card rounded-[2rem] p-8 group overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover:scale-150" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                    <Box className="text-primary w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Assets</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats?.totalAssets || 0}</p>
                  <p className="text-xs font-bold text-emerald-500">+2.4%</p>
                </div>
              </div>

              <div
                onClick={handleExpiringClick}
                className="glossy-card rounded-[2rem] p-8 group cursor-pointer border-yellow-100 bg-yellow-50/20"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="text-yellow-600 w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Warranties</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats?.expiringSoon || 0}</p>
                  <p className="text-xs font-bold text-yellow-600">Action Required</p>
                </div>
              </div>

              <div className="glossy-card rounded-[2rem] p-8 group border-red-100 bg-red-50/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                    <Trash2 className="text-red-600 w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Disposals</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats?.disposalPending || 0}</p>
                  <p className="text-xs font-bold text-red-500">In Workflow</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            {/* Payables Summary Liquid Card */}
            <div className="liquid-glass rounded-[2.5rem] p-8 border-none active:scale-[0.99] transition-transform shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-xl bg-indigo-100">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                </div>
                Payables
              </h3>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Overdue</p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter mt-1">{payablesSummary.overdue}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Processing</p>
                    <p className="text-3xl font-black text-primary tracking-tighter mt-1">{payablesSummary.pending}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                </div>

                <Link href="/payables">
                  <Button className="w-full h-14 rounded-2xl bg-gray-900 text-white hover:bg-black font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all mt-4 border-none">
                    Enter Payables Panel
                  </Button>
                </Link>
              </div>
            </div>

            {/* Modern Notification Center */}
            <div className="liquid-glass rounded-[2.5rem] p-8 border-none shadow-2xl flex flex-col h-[600px] overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shadow-lg shadow-orange-500/10">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Activity</h3>
                </div>
                {notifications && notifications.filter((n: any) => n.isRead === 'false').length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {isLoadingNotifications ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                ) : notifications && notifications.length > 0 ? (
                  notifications.map((n: any) => (
                    <div key={n.id} className="glossy-card rounded-2xl p-5 border-none shadow-indigo-500/5 group">
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                          n.type === 'error' ? "bg-red-50 text-red-600" : "bg-primary/5 text-primary"
                        )}>
                          {n.type || 'Alert'}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400">{format(new Date(n.createdAt), 'h:mm a')}</p>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 mb-1 group-hover:text-primary transition-colors">{n.title}</h4>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-sm font-bold text-gray-400">System Silence.<br />No new alerts.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glossy Dialogs */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl liquid-glass rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="p-10">
            <DialogHeader className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-4xl font-black text-gray-900 tracking-tighter">Bill Summary</DialogTitle>
                  <p className="text-xs font-black text-primary uppercase tracking-widest mt-2">{selectedBillDetails?.billNo}</p>
                </div>
                {selectedBillDetails && (
                  <span className={cn(
                    "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg",
                    calculatePriority(selectedBillDetails).color
                  )}>
                    {calculatePriority(selectedBillDetails).priority}
                  </span>
                )}
              </div>
            </DialogHeader>

            {selectedBillDetails && (
              <div className="space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor</p>
                    <p className="text-base font-bold text-gray-900">{selectedBillDetails.vendorName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</p>
                    <p className="text-2xl font-black text-primary">₹{selectedBillDetails.amount?.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch</p>
                    <p className="text-base font-bold text-gray-900">{selectedBillDetails.branchCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill Date</p>
                    <p className="text-sm font-bold text-gray-900">{selectedBillDetails.billDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</p>
                    <p className="text-sm font-bold text-red-600">{selectedBillDetails.dueDate || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-sm font-bold text-gray-900">{selectedBillDetails.billType}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-[2rem] bg-indigo-50/30">
                  <Button
                    className="flex-1 h-16 rounded-[1.5rem] bg-primary text-white hover:bg-indigo-700 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 border-none"
                    onClick={() => {
                      setSelectedBillForPay(selectedBillDetails);
                      setPayDialogOpen(true);
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Authorize & Pay
                  </Button>

                  <Button
                    variant="ghost"
                    className="flex-1 h-16 rounded-[1.5rem] bg-white text-red-600 hover:bg-red-50 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                    onClick={() => openRejectDialog(selectedBillDetails)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Request
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Standard Dialogs with Liquid Touch */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="liquid-glass rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Hold Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-sm font-bold text-gray-500 leading-relaxed">
              Decline bill processing for <span className="text-gray-900">#{selectedBillForReject?.billNo}</span>.
            </p>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rejection Note</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify the reason for declining..."
                className="rounded-2xl bg-gray-50 border-none min-h-[120px] focus-visible:ring-red-500/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setRejectDialogOpen(false)}>
              Back
            </Button>
            <Button
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold px-8"
              onClick={handleRejectBill}
              disabled={!rejectionReason.trim() || rejectBill.isPending}
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="liquid-glass rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Authorize Payment</DialogTitle>
          </DialogHeader>

          {selectedBillForPay && (
            <div className="space-y-8 py-4">
              <div className="bg-primary/5 p-6 rounded-[2rem] border-none">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">Transfer Amount</p>
                  <p className="text-xl font-black text-primary">₹{selectedBillForPay.amount?.toLocaleString()}</p>
                </div>
                <p className="text-xs font-bold text-indigo-400">{selectedBillForPay.vendorName}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Protocol</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="rounded-xl bg-gray-50 border-none py-6 h-14">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {['Cash', 'Cheque', 'Bank Transfer', 'NEFT', 'RTGS', 'UPI'].map(mode => (
                        <SelectItem key={mode} value={mode} className="rounded-xl focus:bg-primary/5">{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Reference ID</Label>
                  <Input
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="UTR / Check No"
                    className="rounded-xl bg-gray-50 border-none h-14"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-4">
            <Button variant="ghost" className="rounded-xl font-bold h-12 px-6" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl bg-gray-900 text-white hover:bg-black font-black uppercase tracking-widest text-[10px] h-12 px-10 shadow-xl active:scale-95 transition-all border-none"
              onClick={handlePayBillConfirm}
              disabled={!paymentMode || payBill.isPending}
            >
              {payBill.isPending ? 'Verifying...' : 'Authorize Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}


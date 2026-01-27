import { Layout } from "@/components/Layout";
import { useAuthStore } from "@/hooks/use-auth";
import { useAgreementsForRole, useCreateAgreement, usePendingBillsForApproval, useApproveBill, useRejectBill, useUnpaidBills, usePayBill } from "@/hooks/use-payables";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceForm } from "@/components/InvoiceForm";
import { TransactionHistory } from "@/components/TransactionHistory";
import {
    FileText, Plus, ChevronDown, ChevronUp, Receipt, Eye, History,
    Folder, ChevronRight, ArrowLeft, CheckCircle, XCircle, Clock,
    Wallet, CreditCard, AlertTriangle, Filter
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@shared/schema";

type ViewLevel = 'regions' | 'branches' | 'agreements';

export default function Payables() {
    const { user } = useAuthStore();
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedAgreement, setExpandedAgreement] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'invoice' | 'details' | 'history' | null>(null);

    // Navigation State for hierarchy
    const [viewLevel, setViewLevel] = useState<ViewLevel>('regions');
    const [selectedManager, setSelectedManager] = useState<User | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

    // Rejection dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedBillForReject, setSelectedBillForReject] = useState<any>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Pay bill dialog state
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [selectedBillForPay, setSelectedBillForPay] = useState<any>(null);
    const [paymentMode, setPaymentMode] = useState('');

    // Bills management state (Admin/HO)
    const [showBillsView, setShowBillsView] = useState(false);
    const [billsBranchFilter, setBillsBranchFilter] = useState<string>('all');

    // Form State for New Agreement
    const [formData, setFormData] = useState<any>({});

    // Hooks
    const { data: users } = useUsers();
    const { data: agreements, isLoading: loadingAgreements } = useAgreementsForRole(
        user?.role || undefined,
        user?.branchCode || undefined
    );
    const { data: pendingBills, isLoading: loadingPendingBills } = usePendingBillsForApproval(
        user?.role || undefined,
        user?.branchCode || undefined
    );
    const { data: unpaidBills, isLoading: loadingUnpaidBills } = useUnpaidBills();
    const createAgreement = useCreateAgreement();
    const approveBill = useApproveBill();
    const rejectBill = useRejectBill();
    const payBill = usePayBill();

    // Determine if user is Admin/HO (can see bills management)
    const isAdminOrHO = user?.role === 'Admin' || user?.role === 'HO';
    // Determine if user is Admin/Manager (can see hierarchy)
    const isHierarchyUser = user?.role === 'Admin' || user?.role === 'HO' || user?.role?.includes('Manager');

    // Initialize view level based on role
    useEffect(() => {
        if (user?.role === 'Admin' || user?.role === 'HO') {
            setViewLevel('regions');
        } else if (user?.role?.includes('Manager')) {
            setViewLevel('regions');
        } else {
            // Branch User - go directly to agreements
            setViewLevel('agreements');
            setSelectedBranch(user?.branchCode || null);
        }
    }, [user]);

    // Get managers for hierarchy (similar to Assets.tsx)
    const managers = useMemo(() => {
        if (!users) return [];
        let list = users.filter(u => u.role.toLowerCase().includes('manager'));

        // If restricted Manager view, only show themselves
        if (user?.role && user.role !== 'Admin' && user.role !== 'HO' && user.role.includes('Manager')) {
            list = list.filter(u => u.username === user.username);
        }
        return list;
    }, [users, user]);

    // Filter agreements based on current selection
    const currentAgreements = useMemo(() => {
        if (!agreements) return [];
        let filtered = agreements;

        // For hierarchy users (Admin/Manager), filter by managed branches when viewing
        if (isHierarchyUser && selectedManager) {
            // Filter by branches that report to this manager
            const managedBranches = new Set<string>();
            if (selectedManager.branchCode) managedBranches.add(selectedManager.branchCode);

            users?.forEach(u => {
                if ((u as any).ManagerID === selectedManager.role || (u as any).ManagerID === selectedManager.branchCode) {
                    if (u.branchCode) managedBranches.add(u.branchCode);
                }
            });

            filtered = filtered.filter((a: any) => managedBranches.has(String(a.branchCode)));
        }

        if (selectedBranch) {
            const targetBranch = selectedBranch.trim().toLowerCase();
            filtered = filtered.filter((a: any) => {
                const branchCode = String(a.branchCode || "").trim().toLowerCase();
                return branchCode === targetBranch;
            });
        }

        return filtered;
    }, [agreements, selectedManager, selectedBranch, users, user]);

    // Get unique branches from agreements
    const branches = useMemo(() => {
        const branchSet = new Set(currentAgreements.map((a: any) => a.branchCode));
        return Array.from(branchSet).filter(Boolean).sort() as string[];
    }, [currentAgreements]);

    // Navigation Handlers
    const handleManagerClick = (mgr: User) => {
        setSelectedManager(mgr);
        setViewLevel('branches');
    };

    const handleBranchClick = (branchCode: string) => {
        setSelectedBranch(branchCode);
        setViewLevel('agreements');
    };

    const handleBack = () => {
        if (viewLevel === 'agreements') {
            if (isHierarchyUser) {
                setViewLevel('branches');
                setSelectedBranch(null);
            }
        } else if (viewLevel === 'branches') {
            setViewLevel('regions');
            setSelectedManager(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await createAgreement.mutateAsync({
            contractId: formData.contractId || `C-${Math.floor(Math.random() * 10000)}`,
            type: formData.type,
            vendorId: formData.vendorName,
            vendorName: formData.vendorName,
            branchCode: user?.branchCode || 'HO',
            agreementDate: formData.agreementDate,
            renewalDate: formData.renewalDate,
            amount: parseInt(formData.amount),
            billType: formData.billType,
            billingFrequency: formData.billingFrequency || 'Monthly',
            description: formData.description,
            status: 'Active',
            createdBy: user?.username || 'system',
            createdAt: new Date().toISOString()
        });

        setFormData({});
        setShowAddForm(false);
    };

    const toggleExpand = (contractId: string) => {
        if (expandedAgreement === contractId) {
            setExpandedAgreement(null);
            setActiveView(null);
        } else {
            setExpandedAgreement(contractId);
            setActiveView(null);
        }
    };

    const handleApproveBill = async (bill: any) => {
        if (!user) return;
        await approveBill.mutateAsync({
            billId: bill.id,
            username: user.username,
            userId: user.id
        });
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
    };

    const openRejectDialog = (bill: any) => {
        setSelectedBillForReject(bill);
        setRejectDialogOpen(true);
    };

    // Breadcrumb Component
    const Breadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto pb-2">
            {isHierarchyUser && viewLevel !== 'regions' && (
                <button
                    onClick={() => {
                        setViewLevel('regions');
                        setSelectedManager(null);
                        setSelectedBranch(null);
                    }}
                    className="hover:text-primary transition-colors"
                >
                    Regions
                </button>
            )}

            {selectedManager && viewLevel !== 'regions' && (
                <>
                    <ChevronRight className="w-4 h-4" />
                    <button
                        onClick={() => {
                            setViewLevel('branches');
                            setSelectedBranch(null);
                        }}
                        className={viewLevel !== 'branches' ? "hover:text-primary transition-colors" : "font-medium text-foreground"}
                    >
                        {selectedManager.branchCode} (Manager)
                    </button>
                </>
            )}

            {selectedBranch && (
                <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-medium text-foreground">{selectedBranch}</span>
                </>
            )}
        </div>
    );

    // Folder Component
    const FolderItem = ({ label, count, onClick }: { label: string; count?: number; onClick: () => void }) => (
        <div
            onClick={onClick}
            className="bg-card hover:bg-accent/5 transition-all cursor-pointer rounded-xl p-4 border border-border/50 shadow-sm flex items-center gap-4 group"
        >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Folder className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-foreground">{label}</h3>
                {count !== undefined && <p className="text-xs text-muted-foreground">{count} agreements</p>}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
    );

    // Pending Bills Approval Section
    const PendingApprovalsSection = () => {
        if (!isHierarchyUser || !pendingBills || pendingBills.length === 0) return null;

        return (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-800">Pending Bill Approvals ({pendingBills.length})</h3>
                </div>
                <div className="space-y-2">
                    {pendingBills.slice(0, 5).map((bill: any) => (
                        <div key={bill.id} className="bg-white rounded-lg p-3 border border-orange-100 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">{bill.billNo} - ₹{bill.amount?.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                    {bill.vendorName} | {bill.branchCode} | {bill.billDate}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handleApproveBill(bill)}
                                    disabled={approveBill.isPending}
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => openRejectDialog(bill)}
                                    disabled={rejectBill.isPending}
                                >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                    {pendingBills.length > 5 && (
                        <p className="text-xs text-orange-600 text-center">+ {pendingBills.length - 5} more pending approvals</p>
                    )}
                </div>
            </div>
        );
    };

    // Pay bill handler
    const handlePayBill = async () => {
        if (!user || !selectedBillForPay || !paymentMode) return;
        await payBill.mutateAsync({
            billId: selectedBillForPay.id,
            paidBy: user.username,
            modeOfPayment: paymentMode
        });
        setPayDialogOpen(false);
        setSelectedBillForPay(null);
        setPaymentMode('');
    };

    const openPayDialog = (bill: any) => {
        setSelectedBillForPay(bill);
        setPayDialogOpen(true);
    };

    // Calculate priority from due date
    const calculatePriority = (bill: any) => {
        const today = new Date();
        const currentDay = today.getDate();

        // Get bill due date from agreement
        const billDueDay = parseInt(bill.dueDate) || parseInt(bill.billDate) || 10;

        // Simple logic: if today's date > due date, it's overdue
        if (currentDay > billDueDay) {
            return { priority: 'Overdue', color: 'bg-red-100 text-red-700', sortOrder: 0 };
        } else if (currentDay === billDueDay) {
            return { priority: 'Due Today', color: 'bg-orange-100 text-orange-700', sortOrder: 1 };
        } else {
            return { priority: 'Upcoming', color: 'bg-green-100 text-green-700', sortOrder: 2 };
        }
    };

    // Get unique branches from unpaid bills
    const billBranches = useMemo(() => {
        if (!unpaidBills) return [];
        const branchSet = new Set(unpaidBills.map((b: any) => b.branchCode));
        return Array.from(branchSet).filter(Boolean).sort() as string[];
    }, [unpaidBills]);

    // Filter and sort unpaid bills
    const sortedUnpaidBills = useMemo(() => {
        if (!unpaidBills) return [];

        // Show bills that are unpaid and NOT rejected (include bills without approvalStatus or with Approved/Pending)
        let filtered = unpaidBills.filter((b: any) =>
            b.paymentStatus !== 'Paid' && b.approvalStatus !== 'Rejected'
        );

        // Apply branch filter
        if (billsBranchFilter !== 'all') {
            filtered = filtered.filter((b: any) => b.branchCode === billsBranchFilter);
        }

        // Sort by priority (overdue first)
        return filtered.sort((a: any, b: any) => {
            const priorityA = calculatePriority(a).sortOrder;
            const priorityB = calculatePriority(b).sortOrder;
            return priorityA - priorityB;
        });
    }, [unpaidBills, billsBranchFilter]);

    // Bills Management Section for Admin/HO
    const BillsManagementSection = () => {
        if (!isAdminOrHO) return null;

        return (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-800">
                            Bills Management ({sortedUnpaidBills.length} unpaid)
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-blue-600" />
                        <Select value={billsBranchFilter} onValueChange={setBillsBranchFilter}>
                            <SelectTrigger className="w-40 h-8 text-sm">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Branches</SelectItem>
                                {billBranches.map(branch => (
                                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBillsView(!showBillsView)}
                            className="text-blue-600"
                        >
                            {showBillsView ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </div>

                {showBillsView && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {loadingUnpaidBills ? (
                            <Skeleton className="h-16 w-full" />
                        ) : sortedUnpaidBills.length === 0 ? (
                            <p className="text-center text-blue-600 py-4">No unpaid bills found</p>
                        ) : (
                            sortedUnpaidBills.map((bill: any) => {
                                const { priority, color } = calculatePriority(bill);
                                return (
                                    <div key={bill.id} className="bg-white rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">{bill.billNo}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                                                    {priority}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {bill.vendorName} | ₹{bill.amount?.toLocaleString()} | Branch: {bill.branchCode}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Due Day: {bill.dueDate || bill.billDate || 'N/A'} | Bill Date: {bill.billDate}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => openPayDialog(bill)}
                                            disabled={payBill.isPending}
                                        >
                                            <CreditCard className="w-4 h-4 mr-1" />
                                            Pay
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Layout title="Payables">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Payables Management</h2>
                        <p className="text-muted-foreground text-sm">
                            {isHierarchyUser
                                ? "View and manage agreements across branches"
                                : "Manage agreements for your branch"
                            }
                        </p>
                    </div>
                    {viewLevel === 'agreements' && (
                        <Button onClick={() => setShowAddForm(!showAddForm)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Agreement
                        </Button>
                    )}
                </div>

                {/* Pending Approvals for Manager/Admin */}
                <PendingApprovalsSection />

                {/* Bills Management for Admin/HO */}
                <BillsManagementSection />

                {/* Back Button & Breadcrumbs */}
                {isHierarchyUser && viewLevel !== 'regions' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                        </div>
                        <Breadcrumbs />
                    </div>
                )}

                {showAddForm && (
                    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="font-semibold text-lg">New Agreement</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Vendor Name/ID</Label>
                                    <Input
                                        required
                                        value={formData.vendorName || ''}
                                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Contract ID (Optional - Auto Generated)</Label>
                                    <Input
                                        value={formData.contractId || ''}
                                        onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                                        placeholder="Leave blank for auto-generation"
                                    />
                                </div>
                                <div>
                                    <Label>Agreement Type</Label>
                                    <select
                                        required
                                        className="w-full border rounded px-3 py-2"
                                        value={formData.type || ''}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const billTypeMap: Record<string, string> = {
                                                "Rent Agreement": "Rent Invoice",
                                                "KSEB Agreement": "Electricity Bill",
                                                "Water Bill Agreement": "Water Bill",
                                                "Maintenance Agreement": "Maintenance Bill",
                                            };
                                            setFormData({
                                                ...formData,
                                                type,
                                                billType: billTypeMap[type] || ''
                                            });
                                        }}
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Rent Agreement">Rent Agreement</option>
                                        <option value="KSEB Agreement">KSEB Agreement</option>
                                        <option value="Water Bill Agreement">Water Bill Agreement</option>
                                        <option value="Maintenance Agreement">Maintenance Agreement</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Bill Type (Auto-filled)</Label>
                                    <Input
                                        value={formData.billType || ''}
                                        disabled
                                        className="bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <Label>Agreement Date</Label>
                                    <Input
                                        type="date"
                                        required
                                        value={formData.agreementDate || ''}
                                        onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Renewal Date</Label>
                                    <Input
                                        type="date"
                                        required
                                        value={formData.renewalDate || ''}
                                        onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Amount</Label>
                                    <Input
                                        type="number"
                                        required
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Input
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit">Create Agreement</Button>
                                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Content Area */}
                {loadingAgreements ? (
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : (
                    <div className="min-h-[50vh] pb-20 md:pb-0">
                        {/* 1. REGIONS VIEW (Admin/Manager) */}
                        {viewLevel === 'regions' && isHierarchyUser && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {managers.map(mgr => {
                                    // Count agreements for this manager
                                    const managedBranches = new Set<string>();
                                    if (mgr.branchCode) managedBranches.add(mgr.branchCode);
                                    users?.forEach(u => {
                                        if ((u as any).ManagerID === mgr.role || (u as any).ManagerID === mgr.branchCode) {
                                            if (u.branchCode) managedBranches.add(u.branchCode);
                                        }
                                    });
                                    const count = agreements?.filter((a: any) => managedBranches.has(String(a.branchCode))).length || 0;

                                    return (
                                        <FolderItem
                                            key={mgr.id}
                                            label={mgr.branchCode || mgr.username}
                                            count={count}
                                            onClick={() => handleManagerClick(mgr)}
                                        />
                                    );
                                })}
                                {managers.length === 0 && (
                                    <p className="col-span-full text-center text-muted-foreground">No Regions (Managers) found.</p>
                                )}
                            </div>
                        )}

                        {/* 2. BRANCHES VIEW */}
                        {viewLevel === 'branches' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {branches.map(branchCode => (
                                    <FolderItem
                                        key={branchCode}
                                        label={branchCode}
                                        count={currentAgreements.filter((a: any) => a.branchCode === branchCode).length}
                                        onClick={() => handleBranchClick(branchCode)}
                                    />
                                ))}
                                {branches.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Folder className="w-16 h-16 mb-4 opacity-20" />
                                        <p>No branches found for this view.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. AGREEMENTS VIEW */}
                        {viewLevel === 'agreements' && (
                            <div className="space-y-3">
                                {currentAgreements.length > 0 ? (
                                    currentAgreements.map((agreement: any) => (
                                        <div key={agreement.id} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                                            {/* Agreement Header - Clickable */}
                                            <div
                                                onClick={() => toggleExpand(agreement.contractId)}
                                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-primary/10 p-3 rounded-lg">
                                                        <FileText className="text-primary w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-lg">
                                                            Contract: {agreement.contractId}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {agreement.vendorName || agreement.vendorId} | {agreement.type || 'Agreement'} | ₹{agreement.amount?.toLocaleString()}
                                                        </p>
                                                        {isHierarchyUser && (
                                                            <p className="text-xs text-blue-600">Branch: {agreement.branchCode}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agreement.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                                        {agreement.status}
                                                    </span>
                                                    {expandedAgreement === agreement.contractId ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {expandedAgreement === agreement.contractId && (
                                                <div className="border-t border-border bg-gray-50 p-4">
                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 mb-4">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setActiveView(activeView === 'invoice' ? null : 'invoice')}
                                                            variant={activeView === 'invoice' ? 'default' : 'outline'}
                                                        >
                                                            <Receipt className="w-4 h-4 mr-2" />
                                                            Raise Invoice
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={activeView === 'details' ? 'default' : 'outline'}
                                                            onClick={() => setActiveView(activeView === 'details' ? null : 'details')}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={activeView === 'history' ? 'default' : 'outline'}
                                                            onClick={() => setActiveView(activeView === 'history' ? null : 'history')}
                                                        >
                                                            <History className="w-4 h-4 mr-2" />
                                                            Transaction History
                                                        </Button>
                                                    </div>

                                                    {/* Active View Content */}
                                                    {activeView === 'invoice' && (
                                                        <InvoiceForm
                                                            agreement={agreement}
                                                            onSuccess={() => {
                                                                setActiveView('history');
                                                            }}
                                                            onCancel={() => setActiveView(null)}
                                                        />
                                                    )}

                                                    {activeView === 'details' && (
                                                        <div className="bg-white p-4 rounded-lg border">
                                                            <h4 className="font-semibold mb-3">Agreement Details</h4>
                                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                                <div>
                                                                    <span className="text-gray-500">Contract ID:</span>
                                                                    <p className="font-medium">{agreement.contractId}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Type:</span>
                                                                    <p className="font-medium">{agreement.type || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Vendor:</span>
                                                                    <p className="font-medium">{agreement.vendorName || agreement.vendorId}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Amount:</span>
                                                                    <p className="font-medium">₹{agreement.amount?.toLocaleString()}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Agreement Date:</span>
                                                                    <p className="font-medium">{agreement.agreementDate}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Renewal Date:</span>
                                                                    <p className="font-medium">{agreement.renewalDate}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Bill Type:</span>
                                                                    <p className="font-medium">{agreement.billType || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Branch:</span>
                                                                    <p className="font-medium">{agreement.branchCode}</p>
                                                                </div>
                                                                {agreement.description && (
                                                                    <div className="col-span-2">
                                                                        <span className="text-gray-500">Description:</span>
                                                                        <p className="font-medium">{agreement.description}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeView === 'history' && (
                                                        <TransactionHistory contractId={agreement.contractId} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-10">No agreements found.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Bill</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to reject this bill? Please provide a reason.
                        </p>
                        {selectedBillForReject && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                <p><strong>Bill:</strong> {selectedBillForReject.billNo}</p>
                                <p><strong>Amount:</strong> ₹{selectedBillForReject.amount?.toLocaleString()}</p>
                                <p><strong>Vendor:</strong> {selectedBillForReject.vendorName}</p>
                            </div>
                        )}
                        <div>
                            <Label>Rejection Reason *</Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter reason for rejection..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectBill}
                            disabled={!rejectionReason.trim() || rejectBill.isPending}
                        >
                            {rejectBill.isPending ? 'Rejecting...' : 'Reject Bill'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pay Bill Dialog */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pay Bill</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Confirm payment for this bill.
                        </p>
                        {selectedBillForPay && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                <p><strong>Bill:</strong> {selectedBillForPay.billNo}</p>
                                <p><strong>Amount:</strong> ₹{selectedBillForPay.amount?.toLocaleString()}</p>
                                <p><strong>Vendor:</strong> {selectedBillForPay.vendorName}</p>
                                <p><strong>Branch:</strong> {selectedBillForPay.branchCode}</p>
                            </div>
                        )}
                        <div>
                            <Label>Mode of Payment *</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="NEFT">NEFT</SelectItem>
                                    <SelectItem value="RTGS">RTGS</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handlePayBill}
                            disabled={!paymentMode || payBill.isPending}
                        >
                            {payBill.isPending ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

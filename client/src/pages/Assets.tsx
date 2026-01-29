import { useState, useEffect, useMemo } from "react";
import { useAssets, useCreateAsset, useSearchAssets, useApproveTransfer, useUpdateAsset } from "@/hooks/use-assets";
import { useUsers } from "@/hooks/use-users";
import { useAuthStore } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { AssetCard } from "@/components/AssetCard";
import { AssetForm } from "@/components/AssetForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FilterX, Box, Folder, ChevronRight, ArrowLeft, ArrowRightLeft, ChevronDown, Ticket, CheckCircle2, History, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Asset, User } from "@shared/schema";

type ViewLevel = 'regions' | 'branches' | 'types' | 'assets';

export default function Assets() {
  const [_, setLocation] = useLocation();
  const { user } = useAuthStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Navigation State
  const [viewLevel, setViewLevel] = useState<ViewLevel>('regions');
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAssetManagement, setShowAssetManagement] = useState(false);
  const [assetBranchFilter, setAssetBranchFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("All");

  const { mutate: createAsset, isPending: isCreating } = useCreateAsset();
  const approveTransfer = useApproveTransfer();
  const updateAsset = useUpdateAsset();
  const { data: users } = useUsers();

  const { data: allAssets, isLoading: isLoadingAssets, error: assetsError } = useAssets(
    user?.role === "Admin" ? undefined : { role: user?.role, branchCode: user?.branchCode || undefined }
  );

  const displayAssets = allAssets;
  const isLoading = isLoadingAssets;
  const error = assetsError;

  // Initialize view level based on role
  useEffect(() => {
    if (user?.role === 'Admin' || user?.role?.includes('Manager')) {
      setViewLevel('regions');
      // For Manager, we don't auto-select yet, allowing them to see the folder view first.
    } else {
      // Branch User default
      setViewLevel('types');
      setSelectedBranch(user?.branchCode || null);
    }
  }, [user]);

  // Derived Data for Hierarchy
  const managers = useMemo(() => {
    if (!users) return [];
    let list = users.filter(u => u.role.toLowerCase().includes('manager'));

    // If restricted Manager view, only show themselves
    if (user?.role && user.role !== 'Admin' && user.role.includes('Manager')) {
      list = list.filter(u => u.username === user.username);
    }
    return list;
  }, [users, user]);

  // Filter assets based on current selection
  const currentAssets = useMemo(() => {
    if (!displayAssets) return [];
    let filtered = displayAssets;

    // Filter by Manager (Region) scope
    if (selectedManager) {
      // Only apply client-side ManagerID filter if Admin is viewing a manager
      // If Manager is viewing themselves, the server already filtered correctly
      const isAdminViewingManager = user?.role === 'Admin';
      const isManagerViewingSelf = user?.username === selectedManager.username;

      if (isAdminViewingManager && !isManagerViewingSelf) {
        const targetManagerId = (selectedManager.role || "").trim().toLowerCase();
        const targetUsername = (selectedManager.username || "").trim().toLowerCase();

        filtered = filtered.filter(a => {
          const mId = String((a as any).ManagerID || "").trim().toLowerCase();
          // Match against role (Manager 1) or username (Kerala)
          return mId === targetManagerId || mId === targetUsername;
        });
      }
      // If Manager viewing self, skip filtering - server already did it
    }

    if (selectedBranch) {
      const targetBranch = selectedBranch.trim().toLowerCase();
      filtered = filtered.filter(a => {
        const branchName = String(a.branchName || "").trim().toLowerCase();
        const branchCode = String(a.branchCode || "").trim().toLowerCase();
        const fromBranch = String((a as any).fromBranch || "").trim().toLowerCase();
        const fromBranchCode = String((a as any).fromBranchCode || "").trim().toLowerCase();

        const isCurrentBranch = branchName === targetBranch || branchCode === targetBranch;
        const isFromBranch = fromBranch === targetBranch || fromBranchCode === targetBranch;

        // If "Transferred" filter is active, show both to/from
        if (statusFilter === 'Transferred') {
          return isCurrentBranch || isFromBranch;
        }

        // Otherwise only show assets CURRENTLY in this branch
        return isCurrentBranch;
      });
    }

    if (selectedType) {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Filter by Status
    if (statusFilter !== "All") {
      if (statusFilter === "Active") {
        filtered = filtered.filter(a => a.status === 'Active');
      } else if (statusFilter === "Disposed") {
        filtered = filtered.filter(a => a.status === 'Disposed');
      } else if (statusFilter === "Transferred") {
        filtered = filtered.filter(a => a.status === 'Transferred' || a.transferStatus === 'Transferred' || a.status === 'TransferApprovalPending' || a.status?.includes('Transfer'));
      } else if (statusFilter === "Gate Pass") {
        filtered = filtered.filter(a => !!a.gatePassType);
      }
    }

    return filtered;
  }, [displayAssets, selectedManager, selectedBranch, selectedType, statusFilter, user]);

  // Groupings
  const branches = useMemo(() => {
    // List unique branch names from valid assets (filtered by manager)
    const names = new Set(currentAssets.map(a => a.branchName));
    return Array.from(names).sort();
  }, [currentAssets]);

  const assetTypes = useMemo(() => {
    // List unique types from valid assets (filtered by branch)
    const types = new Set(currentAssets.map(a => a.type));
    return Array.from(types).sort();
  }, [currentAssets]);


  // Navigation Handlers
  const handleManagerClick = (mgr: User) => {
    setSelectedManager(mgr);
    setViewLevel('branches');
  };

  const handleBranchClick = (branchName: string) => {
    setSelectedBranch(branchName);
    setViewLevel('types');
  };

  const handleTypeClick = (type: string) => {
    setSelectedType(type);
    setViewLevel('assets');
  };

  const handleBack = () => {
    if (viewLevel === 'assets') {
      setViewLevel('types');
      setSelectedType(null);
    } else if (viewLevel === 'types') {
      if (user?.role === 'Branch User') {
        // No back for branch user
      } else {
        setViewLevel('branches');
        setSelectedBranch(null);
      }
    } else if (viewLevel === 'branches') {
      // Both Admin and Manager can go back to Regions view now
      setViewLevel('regions');
      setSelectedManager(null);
    }
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

  const pendingTransfers = useMemo(() => {
    if (!allAssets) return [];
    return allAssets.filter(a => a.status === 'TransferApprovalPending');
  }, [allAssets]);

  const transferBranches = useMemo(() => {
    const branches = new Set(pendingTransfers.map(t => t.branchCode));
    return Array.from(branches).filter(Boolean).sort();
  }, [pendingTransfers]);

  const filteredTransfers = useMemo(() => {
    if (assetBranchFilter === "all") return pendingTransfers;
    return pendingTransfers.filter(t => t.branchCode === assetBranchFilter);
  }, [pendingTransfers, assetBranchFilter]);

  const AssetManagementSection = () => {
    if (user?.role !== 'Admin' && user?.role !== 'HO') return null;

    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-800">Asset Management</h3>
              <p className="text-xs text-purple-600">{pendingTransfers.length} pending transfers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={assetBranchFilter} onValueChange={setAssetBranchFilter}>
              <SelectTrigger className="w-40 h-8 text-sm bg-white border-purple-200">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {transferBranches.map(branch => (
                  <SelectItem key={branch} value={branch!}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssetManagement(!showAssetManagement)}
              className="text-purple-600 hover:bg-purple-100"
            >
              {showAssetManagement ? <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 transition-transform" />}
            </Button>
          </div>
        </div>

        {showAssetManagement && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {pendingTransfers.length === 0 ? (
              <p className="text-center text-purple-600 py-4 text-sm bg-white/50 rounded-lg">No pending transfers found</p>
            ) : (
              filteredTransfers.map((asset: any) => (
                <div key={asset.id} className="bg-white rounded-lg p-3 border border-purple-100 hover:shadow-sm transition-shadow flex items-center justify-between group">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{asset.name} <span className="text-xs text-muted-foreground">({asset.tagNumber})</span></p>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold">{asset.branchCode}</span>
                      <ArrowRightLeft className="w-3 h-3" />
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold">{asset.toLocation}</span>
                      <span className="ml-2 font-medium">Reason: {asset.reason}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs"
                      onClick={() => handleApproveTransfer(asset)}
                      disabled={approveTransfer.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                      onClick={() => handleRejectTransfer(asset)}
                      disabled={updateAsset.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // Breadcrumb Component
  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto pb-2">
      {(viewLevel !== 'regions') && (
        <button
          onClick={() => {
            setViewLevel('regions');
            setSelectedManager(null);
            setSelectedBranch(null);
            setSelectedType(null);
          }}
          // Enable for both Admin and Manager
          disabled={user?.role === 'Branch User'}
          className={user?.role !== 'Branch User' ? "hover:text-primary transition-colors" : ""}
        >
          Regions
        </button>
      )}

      {selectedManager && viewLevel !== 'regions' && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="font-medium text-foreground">{selectedManager.branchCode} (Manager)</span>
        </>
      )}

      {selectedBranch && (
        <>
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => {
              setViewLevel('types');
              setSelectedType(null);
            }}
            disabled={viewLevel === 'branches'}
            className={viewLevel !== 'branches' ? "hover:text-primary transition-colors" : "font-medium text-foreground"}
          >
            {selectedBranch}
          </button>
        </>
      )}

      {selectedType && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="font-medium text-foreground">{selectedType}</span>
        </>
      )}
    </div>
  );

  // Folder Component
  const FolderItem = ({ label, count, onClick, icon: Icon = Folder }: { label: string, count?: number, onClick: () => void, icon?: any }) => (
    <div
      onClick={onClick}
      className="bg-card hover:bg-accent/5 transition-all cursor-pointer rounded-xl p-4 border border-border/50 shadow-sm flex items-center gap-4 group"
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{label}</h3>
        {count !== undefined && <p className="text-xs text-muted-foreground">{count} items</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </div>
  );

  return (
    <Layout
      title="Assets"
      action={
        (user?.role === 'Admin' || user?.role === 'HO') ? (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full w-10 h-10 p-0 md:w-auto md:h-10 md:px-4 md:rounded-xl shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 md:mr-2" />
                <span className="hidden md:inline">Add Asset</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <AssetForm
                onSubmit={(data) => {
                  createAsset(data, { onSuccess: () => setIsCreateOpen(false) });
                }}
                isLoading={isCreating}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* Search Bar - only show if listing assets directly or searching across everything? 
            For now, keep it global. If user searches, we might want to bypass hierarchy or just filter current view.
            The current implementation filters `displayAssets` which `currentAssets` depends on.
            So search works within the current drill-down context! Perfect.
        */}
        {/* Status Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 md:overflow-visible">
          {[
            { id: 'All', label: 'All Assets', icon: Box, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { id: 'Active', label: 'Active', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
            { id: 'Disposed', label: 'Disposed', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            { id: 'Transferred', label: 'Transferred', icon: History, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
            { id: 'Gate Pass', label: 'Gate Pass', icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
          ].map((filter) => {
            const Icon = filter.icon;
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium whitespace-nowrap
                  ${isActive
                    ? `${filter.bg} ${filter.border} ${filter.color} shadow-sm ring-1 ring-inset ring-${filter.id === 'All' ? 'blue' : filter.id === 'Active' ? 'green' : 'gray'}-500/10`
                    : 'bg-white border-gray-100 text-muted-foreground hover:bg-gray-50'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? filter.color : 'text-muted-foreground'}`} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Asset Management for Admin/HO */}
        <AssetManagementSection />

        {/* Back Button & Breadcrumbs */}
        <div className="flex flex-col gap-2">
          {(viewLevel !== 'regions' && !(user?.role === 'Manager' && viewLevel === 'branches')) && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>
          )}
          <Breadcrumbs />
        </div>

        {/* Content Area */}
        {error ? (
          <div className="bg-destructive/10 p-12 rounded-2xl text-destructive text-center flex flex-col items-center">
            <h3 className="font-bold text-lg mb-2">Something went wrong</h3>
            <p className="text-sm opacity-80 max-w-sm">{(error as Error).message}</p>
            <Button
              variant="outline"
              className="mt-6 border-destructive/20 hover:bg-destructive/20"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="min-h-[50vh] pb-20 md:pb-0">
            {/* View Switching */}

            {/* 1. REGIONS VIEW (ADMIN ONLY) */}
            {viewLevel === 'regions' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map(mgr => (
                  <FolderItem
                    key={mgr.id}
                    label={mgr.branchCode || mgr.username}
                    count={undefined}
                    onClick={() => handleManagerClick(mgr)}
                  />
                ))}
                {managers.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground">No Regions (Managers) found.</p>
                )}
              </div>
            )}

            {/* 2. BRANCHES VIEW */}
            {viewLevel === 'branches' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branches.map(branchName => (
                  <FolderItem
                    key={branchName}
                    label={branchName}
                    count={currentAssets.filter(a => a.branchName === branchName && (a.status === 'Active' || a.status === 'Disposed')).length}
                    onClick={() => handleBranchClick(branchName)}
                  />
                ))}
                {branches.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Box className="w-16 h-16 mb-4 opacity-20" />
                    <p>No branches found for this view.</p>
                  </div>
                )}
              </div>
            )}

            {/* 3. TYPES VIEW */}
            {viewLevel === 'types' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetTypes.map(type => (
                  <FolderItem
                    key={type}
                    label={type}
                    count={currentAssets.filter(a => a.type === type && (a.status === 'Active' || a.status === 'Disposed')).length}
                    onClick={() => handleTypeClick(type)}
                    icon={Box}
                  />
                ))}
                {assetTypes.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Box className="w-16 h-16 mb-4 opacity-20" />
                    <p>No asset types found in this branch.</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. ASSETS VIEW */}
            {viewLevel === 'assets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onClick={() => setLocation(`/assets/${asset.id}`)}
                  />
                ))}
                {currentAssets.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Box className="w-16 h-16 mb-4 opacity-20" />
                    <p>No assets found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout >
  );
}

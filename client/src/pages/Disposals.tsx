import { Layout } from "@/components/Layout";
import { useAuthStore } from "@/hooks/use-auth";
import { useDisposals, useApproveDisposal, useRecommendDisposal, useRejectDisposal, useRemoveFromDisposal } from "@/hooks/use-disposals";
import { useAssets } from "@/hooks/use-assets";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, CheckCircle, XCircle, AlertCircle, Package, Send, ShoppingCart, ThumbsUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type TabType = "cart" | "pending" | "recommended" | "approved" | "all";

export default function Disposals() {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>("cart");

    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role?.includes('Manager');
    const isBranchUser = !isAdmin && !isManager;

    // Fetch all disposals - client-side filter
    const { data: allDisposals, isLoading } = useDisposals(user?.role || undefined, user?.branchCode || undefined);
    const { data: assets } = useAssets({ role: user?.role, branchCode: user?.branchCode || undefined });

    // Get asset details for each disposal
    const disposalsWithAssets = useMemo(() => {
        if (!allDisposals || !assets) return [];
        return allDisposals.map((d: any) => ({
            ...d,
            asset: assets.find((a: any) => String(a.id) === String(d.assetId))
        })).filter((d: any) => d.asset);
    }, [allDisposals, assets]);

    // Filter disposals based on user role and tab
    const filteredDisposals = useMemo(() => {
        let filtered = disposalsWithAssets;

        // Role-based visibility filtering
        if (isBranchUser) {
            filtered = filtered.filter((d: any) => d.initiatedBy === user?.username);
        } else if (isManager) {
            filtered = filtered.filter((d: any) => {
                // Manager sees their own cart, and requests from their branch hierarchy
                if (d.status === 'In Cart') {
                    return d.initiatedBy === user?.username;
                }
                return true;
            });
        } else if (isAdmin) {
            filtered = filtered.filter((d: any) => {
                if (d.status === 'In Cart') {
                    return d.initiatedBy === user?.username;
                }
                return true;
            });
        }

        // Tab-based filtering
        switch (activeTab) {
            case 'cart': return filtered.filter((d: any) => d.status === 'In Cart');
            case 'pending': return filtered.filter((d: any) => d.status === 'Pending'); // Branch -> Manager
            case 'recommended': return filtered.filter((d: any) => d.status === 'Recommended'); // Manager -> Admin
            case 'approved': return filtered.filter((d: any) => d.status === 'Approved');
            default: return filtered;
        }
    }, [disposalsWithAssets, activeTab, user, isAdmin, isManager, isBranchUser]);

    // Counts
    const cartCount = disposalsWithAssets.filter((d: any) => d.status === 'In Cart' && d.initiatedBy === user?.username).length;
    const pendingCount = disposalsWithAssets.filter((d: any) => d.status === 'Pending').length;
    const recommendedCount = disposalsWithAssets.filter((d: any) => d.status === 'Recommended').length;
    const approvedCount = disposalsWithAssets.filter((d: any) => d.status === 'Approved').length;

    const approveDisposal = useApproveDisposal();
    const recommendDisposal = useRecommendDisposal();
    const rejectDisposal = useRejectDisposal();
    const removeFromDisposal = useRemoveFromDisposal();

    const handleSubmitForApproval = async (id: number) => {
        try {
            const res = await fetch(`/api/disposals/${id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submittedBy: user?.username }),
            });
            if (!res.ok) throw new Error('Failed to submit');
            toast({ title: "Success", description: "Disposal submitted for approval" });
            queryClient.invalidateQueries({ queryKey: ['/api/disposals'] });
        } catch (e) {
            toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
        }
    };

    const handleApprove = (id: number) => {
        approveDisposal.mutate({ id, approvedBy: user?.username || 'System' });
    };

    const handleRecommend = (id: number) => {
        recommendDisposal.mutate({ id, recommendedBy: user?.username || 'System' });
    };

    // Reject back to cart (Manager/Admin -> Branch User)
    const handleRejectToCart = (id: number) => {
        rejectDisposal.mutate({ id, rejectedBy: user?.username || 'System' });
    };

    const handleRemove = (id: number) => {
        removeFromDisposal.mutate(id);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Cart': return 'bg-blue-100 text-blue-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Recommended': return 'bg-purple-100 text-purple-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Layout title="Disposal Management">
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Asset Disposals</h2>
                    <p className="text-muted-foreground text-sm">
                        {isBranchUser && "Manage your disposal requests"}
                        {isManager && "Review pending requests and recommend to Admin"}
                        {isAdmin && "Final approval for disposal requests"}
                    </p>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div
                        className={`bg-card p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'cart' ? 'border-blue-400 shadow-md' : 'border-border hover:border-blue-200'}`}
                        onClick={() => setActiveTab('cart')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">My Cart</p>
                                <p className="text-xl font-bold">{cartCount}</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-card p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'pending' ? 'border-yellow-400 shadow-md' : 'border-border hover:border-yellow-200'}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-xl font-bold">{pendingCount}</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-card p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'recommended' ? 'border-purple-400 shadow-md' : 'border-border hover:border-purple-200'}`}
                        onClick={() => setActiveTab('recommended')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <ThumbsUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Recommended</p>
                                <p className="text-xl font-bold">{recommendedCount}</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-card p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'approved' ? 'border-green-400 shadow-md' : 'border-border hover:border-green-200'}`}
                        onClick={() => setActiveTab('approved')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Approved</p>
                                <p className="text-xl font-bold">{approvedCount}</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-card p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'all' ? 'border-gray-400 shadow-md' : 'border-border hover:border-gray-200'}`}
                        onClick={() => setActiveTab('all')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">All</p>
                                <p className="text-xl font-bold">{disposalsWithAssets.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar for Branch User */}
                {activeTab === 'cart' && cartCount > 0 && isBranchUser && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="font-medium text-blue-800">Ready to submit {cartCount} asset(s) for approval?</p>
                            <p className="text-sm text-blue-600">Once submitted, your manager will review the request.</p>
                        </div>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                filteredDisposals.forEach((d: any) => handleSubmitForApproval(d.id));
                            }}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Submit All for Approval
                        </Button>
                    </div>
                )}

                {/* List */}
                <div className="space-y-3">
                    {isLoading ? (
                        Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                    ) : filteredDisposals.length > 0 ? (
                        filteredDisposals.map((disposal: any) => (
                            <div
                                key={disposal.id}
                                className="bg-card p-4 rounded-xl border border-border shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-lg bg-secondary/30 flex items-center justify-center">
                                            <Trash2 className="w-6 h-6 text-foreground/70" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-foreground">{disposal.asset?.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Tag: {disposal.asset?.tagNumber} | Branch: {disposal.asset?.branchName}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Initiated by {disposal.initiatedBy} on {format(new Date(disposal.initiatedAt), "MMM dd, yyyy")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(disposal.status)}`}>
                                            {disposal.status}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {/* Manager Actions for Pending (Branch requests) */}
                                            {isManager && disposal.status === 'Pending' && (
                                                <>
                                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleRecommend(disposal.id)}>
                                                        <ThumbsUp className="w-4 h-4 mr-1" /> Recommend
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleRejectToCart(disposal.id)}>
                                                        <ArrowRight className="w-4 h-4 mr-1" /> Return
                                                    </Button>
                                                </>
                                            )}

                                            {/* Admin Actions for Recommended (Manager requests) */}
                                            {isAdmin && (disposal.status === 'Recommended' || disposal.status === 'Pending') && (
                                                <>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(disposal.id)}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleRejectToCart(disposal.id)}>
                                                        <ArrowRight className="w-4 h-4 mr-1" /> Return
                                                    </Button>
                                                </>
                                            )}

                                            {/* Cart Actions */}
                                            {disposal.status === 'In Cart' && (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => handleSubmitForApproval(disposal.id)}>
                                                        <Send className="w-4 h-4 mr-1" /> Submit
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleRemove(disposal.id)}>
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No {activeTab === 'all' ? '' : activeTab} disposals found</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

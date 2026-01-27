import { useDashboardStats, useExpiringAssets } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, Trash2, Box, Bell, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { Asset } from "@shared/schema";

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
  const [transfersCount, setTransfersCount] = useState(0);

  const [showExpiring, setShowExpiring] = useState(false);

  // Fetch transfers count
  useState(() => {
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
  });

  const handleExpiringClick = () => {
    setShowExpiring(!showExpiring);
    if (!showExpiring) {
      fetchExpiringAssets();
    }
  };

  const handleNotify = async (asset: Asset) => {
    try {
      await Promise.all([
        // Notify Manager
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
        // Notify Admin
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
      alert(`Notifications sent to Manager and Admin for ${asset.name}!`);
    } catch (e) {
      alert('Failed to send notifications');
    }
  };

  return (
    <Layout title="Overview">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Hello, {user?.username}
            </h2>
            <p className="text-muted-foreground text-sm">
              Here's what's happening with your assets today.
            </p>
          </div>
          <Button variant="outline" className="hidden md:flex">Download Report</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingStats ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
          ) : (
            <>
              <StatCard
                title="Total Assets"
                value={stats?.totalAssets || 0}
                icon={<Box className="w-5 h-5" />}
                trend="+2.5% vs last month"
              />
              <div onClick={handleExpiringClick} className="cursor-pointer">
                <StatCard
                  title="Expiring Soon (90 days)"
                  value={stats?.expiringSoon || 0}
                  icon={<AlertCircle className="w-5 h-5" />}
                  className="border-yellow-200 bg-yellow-50 hover:shadow-md transition-shadow"
                />
              </div>
              <StatCard
                title="Transfers Actionable"
                value={transfersCount}
                icon={<ArrowRightLeft className="w-5 h-5" />}
                className="border-blue-200 bg-blue-50"
              />
              <StatCard
                title="Disposal Pending"
                value={stats?.disposalPending || 0}
                icon={<Trash2 className="w-5 h-5" />}
                className="border-red-200 bg-red-50"
              />
            </>
          )}
        </div>

        {/* Expiring Assets Section */}
        {showExpiring && (
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-yellow-200 bg-yellow-50/30">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Assets Expiring Within 90 Days
            </h3>

            {isLoadingExpiring ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : expiringAssets && expiringAssets.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {expiringAssets.map((asset: Asset) => (
                  <div key={asset.id} className="bg-white p-4 rounded-lg border border-yellow-200 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{asset.name}</h4>
                      <p className="text-sm text-muted-foreground">Tag: {asset.tagNumber} | Branch: {asset.branchName}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        {asset.warrantyEnd && (
                          <span className="text-yellow-700">
                            Warranty: {format(new Date(asset.warrantyEnd), "MMM dd, yyyy")}
                          </span>
                        )}
                        {asset.amcEnd && (
                          <span className="text-yellow-700">
                            AMC: {format(new Date(asset.amcEnd), "MMM dd, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNotify(asset)}
                      className="ml-4"
                    >
                      <Bell className="w-4 h-4 mr-1" />
                      Notify
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No assets expiring in the next 90 days</p>
            )}
          </div>
        )}

        {/* Recent Notifications Section - Full Width */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Recent Notifications
          </h3>

          <div className="overflow-y-auto pr-2 space-y-4 custom-scrollbar max-h-96">
            {isLoadingNotifications ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : notifications && notifications.length > 0 ? (
              notifications.slice(0, 10).map((notification: any) => (
                <div key={notification.id} className={`flex gap-3 items-start p-3 rounded-xl transition-colors ${notification.isRead === 'true' ? 'bg-secondary/30' : 'bg-blue-50 hover:bg-blue-100'}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {notification.isRead === 'false' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No notifications</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

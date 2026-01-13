import { useDashboardStats, useAuditLogs } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, Trash2, Box, TrendingUp, History } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats(
    user?.role === "Admin" ? undefined : user?.role,
    user?.branchCode || undefined
  );
  const { data: logs, isLoading: isLoadingLogs } = useAuditLogs();

  const chartData = [
    { name: 'Jan', value: 40 },
    { name: 'Feb', value: 30 },
    { name: 'Mar', value: 20 },
    { name: 'Apr', value: 27 },
    { name: 'May', value: 18 },
    { name: 'Jun', value: 23 },
    { name: 'Jul', value: 34 },
  ];

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
              <StatCard
                title="Expiring Soon"
                value={stats?.expiringSoon || 0}
                icon={<AlertCircle className="w-5 h-5" />}
                className="border-yellow-200 bg-yellow-50"
              />
              <StatCard
                title="AMC Due"
                value={stats?.amcDue || 0}
                icon={<Clock className="w-5 h-5" />}
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

        {/* Analytics & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl shadow-sm border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Asset Value Trends
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Logs Section */}
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 overflow-hidden flex flex-col">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {isLoadingLogs ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : (
                logs?.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex gap-3 items-start p-3 hover:bg-secondary/50 rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {log.user.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.assetId ? `Asset ID: ${log.assetId}` : log.remarks}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(log.timestamp), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

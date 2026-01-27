import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardStats(role?: string, branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);

    const path = `${api.dashboard.stats.path}?${queryParams.toString()}`;

    return useQuery({
        queryKey: [api.dashboard.stats.path, role, branchCode],
        queryFn: async () => {
            const res = await fetch(path);
            if (!res.ok) throw new Error("Failed to fetch dashboard stats");
            return api.dashboard.stats.responses[200].parse(await res.json());
        },
    });
}

export function useAuditLogs() {
    return useQuery({
        queryKey: [api.audit.list.path],
        queryFn: async () => {
            const res = await fetch(api.audit.list.path);
            if (!res.ok) throw new Error("Failed to fetch audit logs");
            return api.audit.list.responses[200].parse(await res.json());
        },
    });
}

export function useExpiringAssets(role?: string, branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);

    const path = `/api/dashboard/expiring?${queryParams.toString()}`;

    return useQuery({
        queryKey: ['/api/dashboard/expiring', role, branchCode],
        queryFn: async () => {
            const res = await fetch(path);
            if (!res.ok) throw new Error("Failed to fetch expiring assets");
            return res.json();
        },
        enabled: false, // Only fetch when explicitly requested
    });
}

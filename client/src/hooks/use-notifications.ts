import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotifications(role?: string, branchCode?: string, username?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);
    if (username) queryParams.append("username", username);

    const path = `/api/notifications?${queryParams.toString()}`;

    return useQuery({
        queryKey: ['/api/notifications', role, branchCode, username],
        queryFn: async () => {
            const res = await fetch(path);
            if (!res.ok) throw new Error("Failed to fetch notifications");
            return res.json();
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
            });
            if (!res.ok) throw new Error("Failed to mark notification as read");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        },
    });
}

export function useCreateNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notification: any) => {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notification),
            });
            if (!res.ok) throw new Error("Failed to create notification");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        },
    });
}

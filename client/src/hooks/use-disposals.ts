import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useCreateDisposal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { assetId: number; initiatedBy: string; reason: string }) => {
            // New endpoint
            const res = await fetch(`/api/assets/${data.assetId}/disposal/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to initiate disposal");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
            // Also invalidate disposals list
            queryClient.invalidateQueries({ queryKey: ['/api/disposals'] });
            toast({ title: "Success", description: "Disposal initiated successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useDisposals(role?: string, branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);

    return useQuery({
        queryKey: ['/api/disposals', role, branchCode],
        queryFn: async () => {
            const res = await fetch(`/api/disposals?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch disposals");
            return res.json();
        },
    });
}

export function useApproveDisposal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { id: number; approvedBy: string }) => {
            // Use the Asset Workflow approve endpoint
            // Note: id passed here is likely disposal.id which == asset.id in my adapter
            const res = await fetch(`/api/assets/${data.id}/disposal/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to approve disposal");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/disposals'] });
            queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
            toast({ title: "Approved", description: "Disposal request approved" });
        },
    });
}

export function useRecommendDisposal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { id: number; recommendedBy: string }) => {
            const res = await fetch(`/api/disposals/${data.id}/recommend`, {
                method: 'PUT' // Adapter endpoint
            });
            if (!res.ok) throw new Error("Failed to recommend disposal");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/disposals'] });
            toast({ title: "Recommended", description: "Disposal recommended to Admin" });
        },
    });
}

export function useRejectDisposal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { id: number; rejectedBy: string }) => {
            const res = await fetch(`/api/disposals/${data.id}/reject`, {
                method: 'PUT' // Adapter endpoint
            });
            if (!res.ok) throw new Error("Failed to return disposal");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/disposals'] });
            toast({ title: "Returned", description: "Disposal returned to Cart" });
        },
    });
}

export function useRemoveFromDisposal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/disposals/${id}`, {
                method: 'DELETE' // Adapter endpoint
            });
            if (!res.ok) throw new Error("Failed to remove disposal");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/disposals'] });
            toast({ title: "Removed", description: "Removed from disposal list" });
        },
    });
}

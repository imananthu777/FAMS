import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useAgreements(branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (branchCode) queryParams.append("branchCode", branchCode);

    return useQuery({
        queryKey: ['/api/payables/agreements', branchCode],
        queryFn: async () => {
            const res = await fetch(`/api/payables/agreements?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch agreements");
            return res.json();
        },
    });
}

// Role-based agreements for hierarchy view
export function useAgreementsForRole(role?: string, branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);

    return useQuery({
        queryKey: ['/api/payables/agreements', 'role', role, branchCode],
        queryFn: async () => {
            const res = await fetch(`/api/payables/agreements?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch agreements");
            return res.json();
        },
        enabled: !!role,
    });
}

export function useBills(branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (branchCode) queryParams.append("branchCode", branchCode);

    return useQuery({
        queryKey: ['/api/payables/bills', branchCode],
        queryFn: async () => {
            const res = await fetch(`/api/payables/bills?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch bills");
            return res.json();
        },
    });
}

// Role-based bills for hierarchy view
export function useBillsForRole(role?: string, branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);

    return useQuery({
        queryKey: ['/api/payables/bills', 'role', role, branchCode],
        queryFn: async () => {
            const res = await fetch(`/api/payables/bills?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch bills");
            return res.json();
        },
        enabled: !!role,
    });
}

// Get pending bills for approval
export function usePendingBillsForApproval(role?: string, branchCode?: string) {
    const queryParams = new URLSearchParams();
    if (role) queryParams.append("role", role);
    if (branchCode) queryParams.append("branchCode", branchCode);

    return useQuery({
        queryKey: ['/api/payables/pending-approvals', role, branchCode],
        queryFn: async () => {
            const res = await fetch(`/api/payables/pending-approvals?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch pending approvals");
            return res.json();
        },
        enabled: !!role,
    });
}

export function useCreateAgreement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/payables/agreements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create agreement");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/payables/agreements'] });
            toast({ title: "Success", description: "Agreement created successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useCreateBill() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/payables/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create bill");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/payables/bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/pending-approvals'] });
            toast({ title: "Success", description: "Bill created successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

// Approve a bill
export function useApproveBill() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ billId, username, userId }: { billId: number; username: string; userId: number }) => {
            const res = await fetch(`/api/payables/bills/${billId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, userId }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to approve bill");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/payables/bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/pending-approvals'] });
            toast({ title: "Success", description: "Bill approved successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

// Reject a bill
export function useRejectBill() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ billId, username, userId, reason }: { billId: number; username: string; userId: number; reason: string }) => {
            const res = await fetch(`/api/payables/bills/${billId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, userId, reason }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to reject bill");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/payables/bills'] });
            queryClient.refetchQueries({ queryKey: ['/api/payables/pending-approvals'] });
            queryClient.refetchQueries({ queryKey: ['/api/dashboard/pending-actions'] });
            toast({ title: "Success", description: "Bill rejected" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

// Get all unpaid bills (Admin/HO)
export function useUnpaidBills() {
    return useQuery({
        queryKey: ['/api/payables/unpaid-bills'],
        queryFn: async () => {
            const res = await fetch('/api/payables/unpaid-bills');
            if (!res.ok) throw new Error("Failed to fetch unpaid bills");
            return res.json();
        },
    });
}

// Pay a bill
export function usePayBill() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ billId, paidBy, modeOfPayment, utrNumber, paymentDate }: { billId: number; paidBy: string; modeOfPayment: string; utrNumber: string; paymentDate?: string }) => {
            const res = await fetch(`/api/payables/bills/${billId}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paidBy, modeOfPayment, utrNumber, paymentDate }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to pay bill");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/payables/bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/unpaid-bills'] });
            // Use refetchQueries to force immediate update on active observers
            queryClient.refetchQueries({ queryKey: ['/api/payables/pending-approvals'] });
            queryClient.refetchQueries({ queryKey: ['/api/dashboard/pending-actions'] });
            toast({ title: "Success", description: "Bill marked as paid" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

// Deprecated or redirect?
export function usePayables(branchCode?: string, type?: string) {
    // Legacy support if needed, but better to migrate
    return useAgreements(branchCode);
}

export function useUpdateBillStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ billId, status, updatedBy, remarks, ...extras }: { billId: number; status: string; updatedBy: string; remarks?: string;[key: string]: any }) => {
            const res = await fetch(`/api/payables/bills/${billId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, updatedBy, remarks, ...extras }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update bill status");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/payables/bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/unpaid-bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/pending-approvals'] });
            toast({ title: "Success", description: "Bill status updated" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/hooks/use-auth";

interface Agreement {
    id: number;
    contractId: string;
    type?: string;
    vendorName?: string;
    billType?: string;
    amount?: number;
    branchCode: string;
}

interface InvoiceFormProps {
    agreement: Agreement;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function InvoiceForm({ agreement, onSuccess, onCancel }: InvoiceFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        billNo: '',
        vendorName: agreement.vendorName || '',
        billType: agreement.billType || '',
        billDate: '',
        amount: '',
        description: '',
        exceptionReason: '',
    });

    const [validation, setValidation] = useState({
        dateValid: true,
        amountValid: true,
        monthlyLimitValid: true,
        needsException: false,
        currentMonthTotal: 0,
        agreementAmount: agreement.amount || 0,
    });

    const validateBill = async () => {
        if (!formData.billDate || !formData.amount) return;

        const monthYear = format(new Date(formData.billDate), 'yyyy-MM');
        try {
            const res = await fetch('/api/bills/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractId: agreement.contractId,
                    amount: parseFloat(formData.amount),
                    billDate: formData.billDate,
                    monthYear,
                }),
            });
            const result = await res.json();
            setValidation(result);
        } catch (e) {
            console.error('Validation error:', e);
        }
    };

    const createBillMutation = useMutation({
        mutationFn: async (billData: any) => {
            const res = await fetch('/api/payables/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData),
            });
            if (!res.ok) throw new Error('Failed to create bill');
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Invoice Created",
                description: "Bill has been successfully created.",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/unpaid-bills'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payables/pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['bills', agreement.contractId] }); // Keep this if used somewhere else, or update if incorrect. 
            // Better to match the keys used in use-payables.ts
            onSuccess?.();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create bill",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        await validateBill();

        if (!validation.dateValid) {
            toast({
                title: "Invalid Date",
                description: "Bill date cannot be more than 90 days old",
                variant: "destructive",
            });
            return;
        }

        if (validation.needsException && !formData.exceptionReason.trim()) {
            toast({
                title: "Exception Reason Required",
                description: "Please provide a reason for exceeding the agreement amount",
                variant: "destructive",
            });
            return;
        }

        const monthYear = format(new Date(formData.billDate), 'yyyy-MM');
        const { user } = useAuthStore.getState();
        const billData = {
            billNo: formData.billNo,
            contractId: agreement.contractId,
            vendorId: agreement.vendorName || 'Unknown',
            vendorName: formData.vendorName,
            billType: formData.billType,
            amount: parseFloat(formData.amount),
            billDate: formData.billDate,
            monthYear,
            branchCode: agreement.branchCode,
            description: formData.description,
            isException: validation.needsException ? 'Yes' : 'No',
            exceptionReason: formData.exceptionReason || null,
            paymentStatus: 'Unpaid',
            createdBy: user?.username
        };

        createBillMutation.mutate(billData);
    };

    const maxDate = format(new Date(), 'yyyy-MM-dd');
    const minDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white border rounded-lg">
            <h3 className="text-lg font-semibold">Raise Invoice</h3>

            <div>
                <Label>Bill Number *</Label>
                <Input
                    required
                    placeholder="Enter bill number (e.g., BILL-2026-001)"
                    value={formData.billNo}
                    onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Vendor Name</Label>
                    <Input value={formData.vendorName} disabled className="bg-gray-50" />
                </div>

                <div>
                    <Label>Bill Type</Label>
                    <Input value={formData.billType} disabled className="bg-gray-50" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Bill Date *</Label>
                    <Input
                        type="date"
                        required
                        min={minDate}
                        max={maxDate}
                        value={formData.billDate}
                        onChange={(e) => {
                            setFormData({ ...formData, billDate: e.target.value });
                            setTimeout(validateBill, 100);
                        }}
                    />
                    {!validation.dateValid && formData.billDate && (
                        <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Bill date cannot be more than 90 days old
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <div>
                    <Label>Amount (₹) *</Label>
                    <Input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => {
                            setFormData({ ...formData, amount: e.target.value });
                            setTimeout(validateBill, 100);
                        }}
                    />
                    {formData.amount && (
                        <p className="text-xs text-gray-500 mt-1">
                            Agreement amount: ₹{validation.agreementAmount}
                        </p>
                    )}
                </div>
            </div>

            {validation.needsException && formData.amount && (
                <Alert variant="default" className="border-orange-500 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                        <strong>Amount exceeds limit!</strong>
                        <br />
                        Monthly total: ₹{validation.currentMonthTotal + parseFloat(formData.amount || '0')}
                        (Agreement: ₹{validation.agreementAmount})
                    </AlertDescription>
                </Alert>
            )}

            {validation.needsException && (
                <div>
                    <Label>Exception Reason *</Label>
                    <Textarea
                        required
                        placeholder="Explain why this amount exceeds the agreement limit..."
                        value={formData.exceptionReason}
                        onChange={(e) => setFormData({ ...formData, exceptionReason: e.target.value })}
                        rows={3}
                    />
                </div>
            )}

            <div>
                <Label>Description</Label>
                <Textarea
                    placeholder="Additional notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                />
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={createBillMutation.isPending}>
                    {createBillMutation.isPending ? 'Creating...' : 'Submit Invoice'}
                </Button>
            </div>
        </form>
    );
}

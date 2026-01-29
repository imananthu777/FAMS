import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Receipt } from "lucide-react";

interface TransactionHistoryProps {
    contractId: string;
}

export function TransactionHistory({ contractId }: TransactionHistoryProps) {
    const { data: bills, isLoading } = useQuery({
        queryKey: ['bills', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/agreements/${contractId}/bills`);
            if (!res.ok) throw new Error('Failed to fetch bills');
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (!bills || bills.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No bills found for this agreement</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Transaction History ({bills.length})
            </h4>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {bills.map((bill: any) => (
                    <div
                        key={bill.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-medium">{bill.billType}</p>
                                <p className="text-sm text-gray-500">
                                    Bill No: {bill.billNo}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-lg">₹{bill.amount?.toLocaleString()}</p>
                                <Badge
                                    variant={bill.paymentStatus === 'Paid' ? 'default' : 'secondary'}
                                    className="text-xs"
                                >
                                    {bill.approvalStatus === 'Hold' ? 'Hold (Postponed)' :
                                        bill.approvalStatus === 'Rejected' ? 'Rejected' :
                                            bill.approvalStatus === 'SentForFinance' ? 'Sent to Finance' :
                                                bill.paymentStatus || 'Unpaid'}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>
                                {bill.billDate ? format(new Date(bill.billDate), 'MMM dd, yyyy') : 'N/A'}
                            </span>
                            {bill.monthYear && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                    {bill.monthYear}
                                </span>
                            )}
                        </div>

                        {bill.isException === 'Yes' && bill.exceptionReason && (
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                                <div className="flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-orange-800">Exception</p>
                                        <p className="text-orange-700">{bill.exceptionReason}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {bill.description && (
                            <p className="mt-2 text-xs text-gray-600 italic">
                                {bill.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

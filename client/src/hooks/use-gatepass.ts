import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useCreateGatePass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      // Determine endpoint based on purpose
      let endpoint = `/api/assets/${data.assetId}/gatepass`;
      if (data.purpose === 'Transfer') {
        endpoint = `/api/assets/${data.assetId}/transfer/initiate`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          // ensure keys match what API expects
          toLocation: data.toBranch || data.toLocation // Transfer uses toLocation/toBranch? API expects toLocation
        }),
      });
      if (!res.ok) throw new Error("Failed to create gate pass / transfer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({ title: "Success", description: "Request processed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

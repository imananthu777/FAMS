import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertAsset, type Asset } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Fetch all assets with optional filtering
export function useAssets(filters?: { role?: string; branchCode?: string }) {
  // Construct query string manually since we don't have a helper for that yet in shared
  const queryParams = new URLSearchParams();
  if (filters?.role) queryParams.append("role", filters.role);
  if (filters?.branchCode) queryParams.append("branchCode", filters.branchCode);
  
  const path = `${api.assets.list.path}?${queryParams.toString()}`;

  return useQuery({
    queryKey: [api.assets.list.path, filters],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Failed to fetch assets");
      return api.assets.list.responses[200].parse(await res.json());
    },
  });
}

// Fetch single asset
export function useAsset(id: number) {
  return useQuery({
    queryKey: [api.assets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.assets.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch asset");
      return api.assets.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// Create asset
export function useCreateAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAsset) => {
      const res = await fetch(api.assets.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create asset");
      }
      return api.assets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.assets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Asset created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// Update asset
export function useUpdateAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertAsset>) => {
      const url = buildUrl(api.assets.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update asset");
      return api.assets.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.assets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.assets.get.path, data.id] });
      toast({ title: "Success", description: "Asset updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// Delete asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.assets.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete asset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.assets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Asset deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// Search assets
export function useSearchAssets(query: string) {
  return useQuery({
    queryKey: [api.assets.search.path, query],
    queryFn: async () => {
      if (!query) return [];
      const url = `${api.assets.search.path}?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      return api.assets.search.responses[200].parse(await res.json());
    },
    enabled: query.length > 2,
  });
}

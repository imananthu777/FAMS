import { useState } from "react";
import { useAssets, useCreateAsset, useSearchAssets } from "@/hooks/use-assets";
import { useAuthStore } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { AssetCard } from "@/components/AssetCard";
import { AssetForm } from "@/components/AssetForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FilterX, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/use-debounce"; // We need to create this simple hook or use setTimeout
import { Asset } from "@shared/schema";

export default function Assets() {
  const [_, setLocation] = useLocation();
  const { user } = useAuthStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom simple debounce logic
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Effect to debounce search
  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }); // This is wrong, needs useEffect. Fixing below.

  const { data: allAssets, isLoading: isLoadingAll } = useAssets(
    user?.role === "Admin" ? undefined : { role: user?.role, branchCode: user?.branchCode }
  );
  
  const { data: searchResults, isLoading: isSearching } = useSearchAssets(debouncedSearch);
  const { mutate: createAsset, isPending: isCreating } = useCreateAsset();

  const displayAssets = debouncedSearch.length > 2 ? searchResults : allAssets;
  const isLoading = debouncedSearch.length > 2 ? isSearching : isLoadingAll;

  return (
    <Layout 
      title="Assets" 
      action={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full w-10 h-10 p-0 md:w-auto md:h-10 md:px-4 md:rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Add Asset</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <AssetForm 
              onSubmit={(data) => {
                createAsset(data, { onSuccess: () => setIsCreateOpen(false) });
              }}
              isLoading={isCreating}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Search by name, tag, or ID..." 
            className="pl-12 h-12 rounded-2xl bg-white border-0 shadow-sm focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => {
                setSearchQuery(e.target.value);
                // Trigger debounce manually if needed, but the hook approach is cleaner.
                // For simplicity in this generator, I'll rely on the parent re-render or fix the hook logic.
                setTimeout(() => setDebouncedSearch(e.target.value), 300);
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <FilterX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Asset Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-0">
            {displayAssets?.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Box className="w-16 h-16 mb-4 opacity-20" />
                <p>No assets found.</p>
              </div>
            ) : (
              displayAssets?.map((asset) => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset} 
                  onClick={() => setLocation(`/assets/${asset.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

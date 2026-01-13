import { useAsset, useUpdateAsset, useDeleteAsset } from "@/hooks/use-assets";
import { useCreateGatePass } from "@/hooks/use-gatepass";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AssetForm } from "@/components/AssetForm";
import { ArrowLeft, Edit, Trash2, Ticket, QrCode, Calendar, MapPin, DollarSign, Activity } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AssetDetail() {
  const [match, params] = useRoute("/assets/:id");
  const [_, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  
  const { data: asset, isLoading } = useAsset(id);
  const { mutate: updateAsset, isPending: isUpdating } = useUpdateAsset();
  const { mutate: deleteAsset, isPending: isDeleting } = useDeleteAsset();
  const { mutate: createGatePass, isPending: isGeneratingPass } = useCreateGatePass();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [destinationBranch, setDestinationBranch] = useState("");

  if (isLoading) return <div className="p-8 text-center">Loading asset...</div>;
  if (!asset) return <div className="p-8 text-center">Asset not found</div>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/assets")} className="rounded-full hover:bg-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded-md">{asset.tagNumber}</span>
              • {asset.type}
            </p>
          </div>
          <div className="flex gap-2">
             <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Edit className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Asset</DialogTitle>
                </DialogHeader>
                <AssetForm 
                  defaultValues={asset}
                  onSubmit={(data) => {
                    updateAsset({ id, ...data }, { onSuccess: () => setIsEditOpen(false) });
                  }}
                  isLoading={isUpdating}
                  onCancel={() => setIsEditOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="rounded-full">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the asset.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAsset(id, { onSuccess: () => setLocation("/assets") })}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Action Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Dialog open={isPassOpen} onOpenChange={setIsPassOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md shadow-md shadow-blue-200">
                <Ticket className="w-4 h-4 mr-2" />
                Gate Pass
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Gate Pass</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Current Branch</Label>
                  <Input value={asset.branchCode} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Destination Branch</Label>
                  <Input 
                    placeholder="Enter branch code" 
                    value={destinationBranch}
                    onChange={(e) => setDestinationBranch(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  disabled={!destinationBranch || isGeneratingPass}
                  onClick={() => createGatePass({
                    assetId: asset.id.toString(),
                    toBranch: destinationBranch,
                    generatedBy: "Current User" // Mock
                  }, { onSuccess: () => setIsPassOpen(false) })}
                >
                  {isGeneratingPass ? "Generating..." : "Create Pass"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="h-12 border-dashed border-2">
            <QrCode className="w-4 h-4 mr-2" />
            Print Tag
          </Button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              General Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Status</span>
                <Badge>{asset.status}</Badge>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{asset.type}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">{asset.branchName} ({asset.branchCode})</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Dates & Warranty
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Purchased</span>
                <span className="font-medium">{format(new Date(asset.purchaseDate), "PPP")}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Warranty Ends</span>
                <span className="font-medium text-orange-600">
                  {asset.warrantyEnd ? format(new Date(asset.warrantyEnd), "PPP") : "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">AMC Renewal</span>
                <span className="font-medium">
                  {asset.amcEnd ? format(new Date(asset.amcEnd), "PPP") : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

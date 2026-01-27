import { useAsset, useUpdateAsset, useDeleteAsset } from "@/hooks/use-assets";
import { useCreateGatePass } from "@/hooks/use-gatepass";
import { useCreateDisposal } from "@/hooks/use-disposals";
import { useUsers } from "@/hooks/use-users";
import { useAuthStore } from "@/hooks/use-auth";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AssetForm } from "@/components/AssetForm";
import { ArrowLeft, Edit, Trash2, ArrowRightLeft, QrCode, Calendar, MapPin, Activity, Ticket } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AssetDetail() {
  const [match, params] = useRoute("/assets/:id");
  const [_, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { user } = useAuthStore();

  const { data: asset, isLoading } = useAsset(id);
  const { data: users } = useUsers();
  const { mutate: updateAsset, isPending: isUpdating } = useUpdateAsset();
  const { mutate: deleteAsset, isPending: isDeleting } = useDeleteAsset();
  const { mutate: createGatePass, isPending: isGeneratingPass } = useCreateGatePass();
  const { mutate: createDisposal, isPending: isAddingToDisposal } = useCreateDisposal();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isDisposalOpen, setIsDisposalOpen] = useState(false);

  // Transfer form state
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  // Gate Pass (Temporary) form state
  const [passLocation, setPassLocation] = useState("");
  const [passReason, setPassReason] = useState("");

  // Disposal form state
  const [disposalReason, setDisposalReason] = useState("");

  // Get managers (regions) 
  const managers = useMemo(() => {
    return users?.filter((u: any) => u.role?.includes('Manager')) || [];
  }, [users]);

  // Get branches for selected region
  const branchesForRegion = useMemo(() => {
    if (!selectedRegion) return [];
    // Find the manager's branchCode and filter users reporting to them or with same branchCode
    const manager = managers.find((m: any) => m.username === selectedRegion);
    if (!manager) return [];

    return users?.filter((u: any) =>
      u.ReportingTo === manager.username ||
      u.ReportingTo === manager.role ||
      u.branchCode === manager.branchCode
    ) || [];
  }, [selectedRegion, managers, users]);

  if (isLoading) return <div className="p-8 text-center">Loading asset...</div>;
  if (!asset) return <div className="p-8 text-center">Asset not found</div>;

  const handleTransfer = () => {
    createGatePass({
      assetId: asset.id.toString(),
      fromBranch: asset.branchCode,
      toBranch: selectedBranch,
      purpose: "Transfer",
      generatedBy: user?.username || "System"
    }, {
      onSuccess: () => {
        setIsTransferOpen(false);
        setSelectedRegion("");
        setSelectedBranch("");
      }
    });
  };

  const handleTemporaryPass = () => {
    createGatePass({
      assetId: asset.id.toString(),
      fromBranch: asset.branchCode,
      toLocation: passLocation,
      reason: passReason,
      purpose: "Temporary",
      generatedBy: user?.username || "System"
    }, {
      onSuccess: () => {
        setIsPassOpen(false);
        setPassLocation("");
        setPassReason("");
      }
    });
  };

  const handleDisposal = () => {
    createDisposal({
      assetId: asset.id,
      initiatedBy: user?.username || "System",
      reason: disposalReason
    }, {
      onSuccess: () => {
        setIsDisposalOpen(false);
        setDisposalReason("");
      }
    });
  };

  const isDisposed = asset.status === 'Disposed' || asset.status === 'Pending Disposal';

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

        {/* Status Badge for Disposal */}
        {isDisposed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            <strong>⚠️ {asset.status}</strong> - This asset is marked for disposal.
          </div>
        )}

        {/* Action Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Initiate Transfer */}
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md shadow-md shadow-blue-200"
                disabled={isDisposed}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Initiate Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Initiate Asset Transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>From Branch</Label>
                  <Input value={`${asset.branchName} (${asset.branchCode})`} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Select Region</Label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setSelectedBranch("");
                    }}
                  >
                    <option value="">-- Select Region --</option>
                    {managers.map((m: any) => (
                      <option key={m.id} value={m.username}>{m.username} ({m.branchCode})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Select Branch</Label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={!selectedRegion}
                  >
                    <option value="">-- Select Branch --</option>
                    {branchesForRegion.map((b: any) => (
                      <option key={b.id} value={b.branchCode}>{b.username} ({b.branchCode})</option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedBranch || isGeneratingPass}
                  onClick={handleTransfer}
                >
                  {isGeneratingPass ? "Creating..." : "Initiate Transfer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Generate Pass (Temporary) */}
          <Dialog open={isPassOpen} onOpenChange={setIsPassOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-12 border-2"
                disabled={isDisposed}
              >
                <Ticket className="w-4 h-4 mr-2" />
                Gate Pass
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Temporary Gate Pass</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>From Branch</Label>
                  <Input value={`${asset.branchName} (${asset.branchCode})`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Destination Location</Label>
                  <Input
                    placeholder="e.g., Repair Shop, Meeting Venue"
                    value={passLocation}
                    onChange={(e) => setPassLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="e.g., Sent for repair, Taking to client meeting"
                    value={passReason}
                    onChange={(e) => setPassReason(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!passLocation || isGeneratingPass}
                  onClick={handleTemporaryPass}
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

          {/* Initiate Disposal */}
          <Dialog open={isDisposalOpen} onOpenChange={setIsDisposalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={isDisposed}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Initiate Disposal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Initiate Asset Disposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  This will add the asset to your disposal cart. A manager must approve before disposal is finalized.
                </div>
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Input value={`${asset.name} (${asset.tagNumber})`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Reason for Disposal</Label>
                  <Textarea
                    placeholder="e.g., End of life, Damaged beyond repair, Obsolete"
                    value={disposalReason}
                    onChange={(e) => setDisposalReason(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isAddingToDisposal}
                  onClick={handleDisposal}
                >
                  {isAddingToDisposal ? "Adding..." : "Add to Disposal Cart"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                <Badge className={asset.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {asset.status}
                </Badge>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{asset.type}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">{asset.branchName} ({asset.branchCode})</span>
              </div>
              {asset.mappedEmployee && (
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="font-medium">{asset.mappedEmployee}</span>
                </div>
              )}
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

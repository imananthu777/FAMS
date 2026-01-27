import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role, InsertRole } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

const PERMISSION_GROUPS = [
    {
        name: "Asset Management",
        permissions: [
            { key: "assetCreation", label: "Create Assets" },
            { key: "assetModification", label: "Edit Assets" },
            { key: "assetDeletion", label: "Delete Assets" },
            { key: "assetConfirmation", label: "Confirm Assets" },
        ]
    },
    {
        name: "Disposal Workflow",
        permissions: [
            { key: "initiateDisposal", label: "Initiate Disposal" },
            { key: "approveDisposal", label: "Approve Disposal" },
        ]
    },
    {
        name: "Transfer Workflow",
        permissions: [
            { key: "initiateTransfer", label: "Initiate Transfer" },
            { key: "approveTransfer", label: "Approve Transfer" },
        ]
    },
    {
        name: "Payables",
        permissions: [
            { key: "createAgreement", label: "Create Agreements" },
            { key: "approveAgreement", label: "Approve Agreements" },
            { key: "createBill", label: "Create Bills" },
            { key: "approveBill", label: "Approve Bills" },
        ]
    },
    {
        name: "Administration",
        permissions: [
            { key: "manageRoles", label: "Manage Roles" },
        ]
    }
];

export default function Roles() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Fetch Roles
    const { data: roles, isLoading } = useQuery<Role[]>({
        queryKey: ["/api/roles"],
        queryFn: getQueryFn({ on401: "returnNull" }),
    });

    // Fetch Current User to check permissions (HO only)
    const { data: user } = useQuery<any>({
        queryKey: ["/api/user"],
    });

    const createRoleMutation = useMutation({
        mutationFn: async (newRole: Partial<InsertRole>) => {
            const res = await apiRequest("POST", "/api/roles", newRole);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            setIsDialogOpen(false);
            toast({
                title: "Role Created",
                description: "New role has been successfully created.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const canManageRoles = user?.role === "HO" || roles?.find(r => r.name === user?.role)?.manageRoles === "true";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-8 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Role Management</h1>
                    <p className="text-muted-foreground">
                        Manage system roles and permissions.
                    </p>
                </div>
                {canManageRoles && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <RoleForm
                                onSubmit={(data) => createRoleMutation.mutate(data)}
                                isSubmitting={createRoleMutation.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>System Roles</CardTitle>
                        <CardDescription>
                            List of all defined roles and their capabilities.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Permissions Overview</TableHead>
                                        {/* <TableHead>Actions</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {roles?.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                                    {role.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{role.description}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {getPermissionSummary(role)}
                                                </div>
                                            </TableCell>
                                            {/* <TableCell>
                        <Button variant="ghost" size="sm" disabled>Edit</Button>
                      </TableCell> */}
                                        </TableRow>
                                    ))}
                                    {!roles?.length && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                No roles found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function RoleForm({ onSubmit, isSubmitting }: { onSubmit: (data: any) => void, isSubmitting: boolean }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [permissions, setPermissions] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            description,
            ...permissions
        });
    };

    const handleCheck = (key: string, checked: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [key]: checked ? "true" : "false"
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Regional Manager"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Describe the role's responsibilities..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="space-y-4 border rounded-md p-4">
                    <h3 className="font-medium">Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {PERMISSION_GROUPS.map((group) => (
                            <div key={group.name} className="space-y-3">
                                <h4 className="text-sm font-semibold text-muted-foreground">{group.name}</h4>
                                <div className="space-y-2">
                                    {group.permissions.map((perm) => (
                                        <div key={perm.key} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={perm.key}
                                                checked={permissions[perm.key] === "true"}
                                                onCheckedChange={(checked) => handleCheck(perm.key, checked as boolean)}
                                            />
                                            <Label htmlFor={perm.key} className="text-sm font-normal cursor-pointer">
                                                {perm.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Role
                </Button>
            </div>
        </form>
    );
}

function getPermissionSummary(role: Role) {
    const counts = {
        total: 0,
        assets: 0,
        disposal: 0,
        transfer: 0,
        payables: 0,
        admin: 0
    };

    // Simple heuristic to count/display
    if (role.assetCreation === "true") counts.assets++;
    if (role.assetModification === "true") counts.assets++;
    if (role.initiateDisposal === "true") counts.disposal++;
    if (role.approveDisposal === "true") counts.disposal++;
    if (role.initiateTransfer === "true") counts.transfer++;
    if (role.approveTransfer === "true") counts.transfer++;
    if (role.createBill === "true") counts.payables++;
    if (role.approveBill === "true") counts.payables++;
    if (role.manageRoles === "true") counts.admin++;

    const badges = [];
    if (counts.admin > 0) badges.push(<span key="adm" className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">Admin</span>);
    if (counts.payables > 0) badges.push(<span key="pay" className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Payables ({counts.payables})</span>);
    if (counts.assets > 0) badges.push(<span key="ast" className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Assets ({counts.assets})</span>);
    if (counts.disposal > 0) badges.push(<span key="dsp" className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">Disposal</span>);

    if (badges.length === 0) return <span className="text-muted-foreground text-xs">Read Only</span>;
    return badges;
}

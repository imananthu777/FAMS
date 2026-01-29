import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema, type InsertAsset, type Asset } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore, useUsers } from "@/hooks/use-auth";
import { useEffect, useMemo } from "react";
import { DialogFooter } from "@/components/ui/dialog";

interface AssetFormProps {
  defaultValues?: Partial<Asset>;
  onSubmit: (data: InsertAsset) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export function AssetForm({ defaultValues, onSubmit, isLoading, onCancel }: AssetFormProps) {
  const { user: currentUser } = useAuthStore();
  const { data: users = [] } = useUsers();

  const form = useForm<InsertAsset>({
    resolver: zodResolver(insertAssetSchema),
    defaultValues: {
      status: "Active",
      branchUser: currentUser?.username || "System",
      branchName: currentUser?.role === "Branch User" ? (currentUser.username === "Admin ID" ? "Head Office" : currentUser.username) : "",
      branchCode: currentUser?.role === "Branch User" ? String(currentUser.branchCode) : "",
      ...defaultValues,
    } as InsertAsset,
  });

  // Re-sync if defaultValues change
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        status: "Active",
        branchUser: currentUser?.username || "System",
        ...defaultValues
      } as InsertAsset);
    }
  }, [defaultValues, form.reset]);

  const availableBranches = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === "Admin" || currentUser.role === "HO") {
      // Admins/HO see all distinct branch codes/names from users list
      const branches = users
        // Filter out Admin/HO users to avoid duplication/confusion, or keep them if they represent branches
        .filter(u => u.branchCode && u.branchCode !== "HO")
        // Exclude Managers (Regions)
        .filter(u => !u.role.toLowerCase().includes("manager"))
        .map(u => ({ name: u.username, code: String(u.branchCode) }));

      // Add HO as a choice
      branches.unshift({ name: "Head Office", code: "HO" });

      // Remove duplicates based on code
      return Array.from(new Map(branches.map(item => [item.code, item])).values());
    }

    if (currentUser.role?.includes("Manager")) {
      // Managers see branches reporting to them
      const branches = users
        .filter(u => String((u as any).ReportingTo) === String(currentUser.branchCode))
        .map(u => ({ name: u.username, code: String(u.branchCode) }));

      // Also add manager's own branch
      branches.unshift({ name: currentUser.username, code: String(currentUser.branchCode) });
      return branches;
    }

    return [];
  }, [currentUser, users]);

  const isBranchUser = currentUser?.role === "Branch User";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Name</FormLabel>
                <FormControl>
                  <Input placeholder="MacBook Pro M2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tagNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tag Number</FormLabel>
                <FormControl>
                  <Input placeholder="AST-2024-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IT">IT Equipment</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="Machinery">Machinery</SelectItem>
                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Disposal">Disposal Pending</SelectItem>
                    <SelectItem value="Disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="warrantyEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warranty End</FormLabel>
                <FormControl>
                  <Input type="date" value={field.value || ""} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="branchName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch Name</FormLabel>
                {isBranchUser ? (
                  <FormControl>
                    <Input {...field} readOnly className="bg-secondary/50" />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      // Auto-select corresponding code
                      const branch = availableBranches.find(b => b.name === val);
                      if (branch) form.setValue("branchCode", branch.code);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBranches.map((b) => (
                        <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branchCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch Code</FormLabel>
                {isBranchUser ? (
                  <FormControl>
                    <Input {...field} readOnly className="bg-secondary/50" />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      // Auto-select corresponding name
                      const branch = availableBranches.find(b => b.code === val);
                      if (branch) form.setValue("branchName", branch.name);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select code" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBranches.map((b) => (
                        <SelectItem key={b.code} value={b.code}>{b.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="branchUser"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white">
            {isLoading ? "Saving..." : "Save Asset"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

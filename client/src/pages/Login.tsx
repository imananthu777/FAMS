import { useState } from "react";
import { useLogin, useUsers } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [selectedUser, setSelectedUser] = useState("");
  const { mutate: login, isPending: isLoggingIn } = useLogin();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const [_, setLocation] = useLocation();

  const handleLogin = () => {
    if (!selectedUser) return;
    login(selectedUser, {
      onSuccess: () => setLocation("/"),
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F2F2F7] p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Select your user account to continue</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select User</label>
            <Select onValueChange={setSelectedUser} disabled={isLoadingUsers}>
              <SelectTrigger className="h-12 bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <div className="p-4 flex justify-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading users...
                  </div>
                ) : (
                  users?.map((user) => (
                    <SelectItem key={user.id} value={user.username}>
                      <span className="font-medium">{user.username}</span> 
                      <span className="text-xs text-muted-foreground ml-2">({user.role})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full h-12 text-base rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
            onClick={handleLogin}
            disabled={!selectedUser || isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

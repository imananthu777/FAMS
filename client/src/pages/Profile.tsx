import { Layout } from "@/components/Layout";
import { useAuthStore } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Building, Shield, Settings, LogOut } from "lucide-react";

import { useUsers } from "@/hooks/use-users";

export default function Profile() {
  const { user, logout } = useAuthStore();
  const { data: users } = useUsers();

  // Find full user details
  const fullUser = users?.find(u => u.username === user?.username);

  if (!user) return null;

  return (
    <Layout title="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-secondary/20">
          <CardContent className="pt-6 flex flex-col items-center text-center pb-8">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg mb-4">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
              <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{user.username}</h2>
            <p className="text-muted-foreground font-medium">{user.role}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch Code</p>
                <p className="font-medium">{user.branchCode || "Head Office"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role Access</p>
                <p className="font-medium">{user.role}</p>
              </div>
            </div>

            {fullUser && (fullUser as any).ManagerID && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reporting Manager</p>
                  <p className="font-medium">{(fullUser as any).ManagerID}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button variant="outline" className="w-full h-12 justify-start rounded-xl" onClick={() => { }}>
            <Settings className="mr-2 w-5 h-5" />
            App Settings
          </Button>
          <Button
            variant="destructive"
            className="w-full h-12 justify-start rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shadow-none"
            onClick={logout}
          >
            <LogOut className="mr-2 w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </Layout>
  );
}

import { ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { LayoutDashboard, Box, FileText, UserCircle, LogOut, Trash2, Menu, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/use-auth";
import { useDisposals } from "@/hooks/use-disposals";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

function SidebarContent({ user, location, navItems, logout }: any) {
  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          AssetManager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.branchCode ? `Branch: ${user.branchCode}` : "Head Office"}
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item: any) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function Layout({ children, title, action }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();

  // Reactive fetch of all disposals
  const { data: disposals } = useDisposals(user?.role || undefined, user?.branchCode || undefined);

  // Determine visibility and badge count
  const showDisposals = disposals && disposals.length > 0;

  let badgeCount = 0;
  if (disposals) {
    if (user?.role?.includes('Manager')) {
      // Managers see Pending count
      badgeCount = disposals.filter((d: any) => d.status === 'Pending').length;
    } else if (user?.role === 'Admin') {
      // Admins see Pending + Recommended count
      badgeCount = disposals.filter((d: any) => d.status === 'Pending' || d.status === 'Recommended').length;
    } else {
      // Branch users see Cart count
      badgeCount = disposals.filter((d: any) => d.status === 'In Cart').length;
    }
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/" },
    { icon: Box, label: "Assets", path: "/assets" },
    { icon: FileText, label: "Payables", path: "/payables" },
    ...(showDisposals ? [{
      icon: Trash2,
      label: "Disposals",
      path: "/disposals",
      badge: badgeCount > 0 ? badgeCount : undefined
    }] : []),
    ...(user?.role === 'HO' ? [{
      icon: ShieldCheck,
      label: "Roles",
      path: "/roles"
    }] : []),
    { icon: UserCircle, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24 md:pb-0 md:pl-64 transition-all duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border/50 flex-col z-50">
        <SidebarContent user={user} location={location} navItems={navItems} logout={logout} />
      </aside>

      {/* Header (Mobile & Desktop) */}
      <header className="sticky top-0 z-40 px-6 py-4 glass md:bg-transparent md:backdrop-blur-none md:border-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden -ml-2">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 flex flex-col">
              <SidebarContent user={user} location={location} navItems={navItems} logout={logout} />
            </SheetContent>
          </Sheet>

          {title && <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>}
        </div>
        <div className="flex items-center gap-3">
          {action}
          <button
            onClick={logout}
            className="md:hidden p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-4 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border/50 pb-safe z-50 safe-bottom">
        <div className="flex justify-around items-center p-2">
          {navItems.slice(0, 4).map((item: any) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 cursor-pointer w-16 relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-6 h-6 transition-transform duration-200", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

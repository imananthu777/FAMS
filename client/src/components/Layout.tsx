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
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-3xl">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Box className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              FAMS
            </h1>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">
              Liquid Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item: any) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-500 font-medium cursor-pointer group relative overflow-hidden",
                  isActive
                    ? "bg-primary text-white shadow-xl shadow-primary/25 scale-[1.02]"
                    : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "animate-pulse" : "group-hover:scale-110")} />
                <span className="relative z-10">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-destructive text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="p-4 rounded-3xl bg-gray-50/50 border border-gray-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserCircle className="text-indigo-600 w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.branchCode || "HO"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children, title, action }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();
  const { data: disposals } = useDisposals(user?.role || undefined, user?.branchCode || undefined);

  const showDisposals = disposals && disposals.length > 0;
  let badgeCount = 0;
  if (disposals) {
    if (user?.role?.includes('Manager')) {
      badgeCount = disposals.filter((d: any) => d.status === 'Pending').length;
    } else if (user?.role === 'Admin') {
      badgeCount = disposals.filter((d: any) => d.status === 'Pending' || d.status === 'Recommended').length;
    } else {
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
    <div className="min-h-screen bg-background flex">
      {/* Mesh Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mesh-bg blur-3xl z-0" />

      {/* Desktop Sidebar - Fixed width container */}
      <aside className="hidden md:block w-72 flex-shrink-0 p-4 relative z-50">
        <div className="sticky top-4 h-[calc(100vh-2rem)] liquid-glass rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden border-white/20">
          <SidebarContent user={user} location={location} navItems={navItems} logout={logout} />
        </div>
      </aside>

      {/* Main Content Area - Flex grows to fill remaining space */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 px-8 py-6 bg-background/50 backdrop-blur-3xl flex items-center justify-between border-b border-gray-100/50">
          <div className="flex items-center gap-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 glass border-none">
                <SidebarContent user={user} location={location} navItems={navItems} logout={logout} />
              </SheetContent>
            </Sheet>

            {title && (
              <div className="flex flex-col">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  {title}
                </h2>
                <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-widest">
                  System Interface / v2.6.0
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 border border-white/50 text-sm font-bold text-gray-900">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live System
            </div>
            {action}
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 p-8 pt-6 max-w-[1600px] w-full mx-auto overflow-hidden flex-1">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 liquid-glass rounded-[2rem] p-2 z-50 border-white/40 shadow-2xl">
        <div className="flex justify-around items-center h-14">
          {navItems.slice(0, 4).map((item: any) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-500 cursor-pointer w-14 h-14 relative",
                    isActive ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "text-gray-400"
                  )}
                >
                  <item.icon className={cn("w-6 h-6")} strokeWidth={isActive ? 2.5 : 2} />
                  {item.badge && (
                    <span className="absolute top-1 right-1 bg-destructive text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
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


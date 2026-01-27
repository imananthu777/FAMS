import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/hooks/use-auth";
import { useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy Pages
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Assets = lazy(() => import("@/pages/Assets"));
const AssetDetail = lazy(() => import("@/pages/AssetDetail"));
const Scan = lazy(() => import("@/pages/Scan"));
const Payables = lazy(() => import("@/pages/Payables"));
const Profile = lazy(() => import("@/pages/Profile"));
const Disposals = lazy(() => import("@/pages/Disposals"));
const Roles = lazy(() => import("@/pages/Roles"));

// Loading Component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function Router() {
  const { user } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user && location !== "/login") {
      setLocation("/login");
    } else if (user && location === "/login") {
      setLocation("/");
    }
  }, [user, location, setLocation]);

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/assets" component={Assets} />
        <Route path="/assets/:id" component={AssetDetail} />
        <Route path="/payables" component={Payables} />
        <Route path="/disposals" component={Disposals} />
        <Route path="/profile" component={Profile} />
        <Route path="/roles" component={Roles} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { ErrorBoundary } from "@/components/ErrorBoundary";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Router />
          <Toaster />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

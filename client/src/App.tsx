import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/hooks/use-auth";
import { useEffect } from "react";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Assets from "@/pages/Assets";
import AssetDetail from "@/pages/AssetDetail";
import Scan from "@/pages/Scan";
import Profile from "@/pages/Profile";

function Router() {
  const { user } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, location, setLocation]);

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/assets" component={Assets} />
      <Route path="/assets/:id" component={AssetDetail} />
      <Route path="/scan" component={Scan} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

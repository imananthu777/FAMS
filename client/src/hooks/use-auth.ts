import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type User } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for session-only persistence
    }
  )
);

export function useLogin() {
  const login = useAuthStore((state) => state.login);
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (user: User) => {
      login(user);
      toast({ title: "Welcome back", description: `Logged in as ${user.username}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useUsers() {
  return useQuery({
    queryKey: [api.auth.users.path],
    queryFn: async () => {
      const res = await fetch(api.auth.users.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.auth.users.responses[200].parse(await res.json());
    }
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { User } from "@shared/schema";

export function useUsers() {
    return useQuery({
        queryKey: [api.auth.users.path],
        queryFn: async () => {
            const res = await fetch(api.auth.users.path);
            if (!res.ok) throw new Error("Failed to fetch users");
            // Use the output schema if available, otherwise just cast
            return (await res.json()) as User[];
        },
    });
}

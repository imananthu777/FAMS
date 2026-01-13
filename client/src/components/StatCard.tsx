import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("bg-card p-6 rounded-2xl shadow-sm border border-border/50", className)}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
          {trend && <p className="text-xs text-green-600 font-medium mt-1">{trend}</p>}
        </div>
        <div className="p-3 bg-secondary rounded-xl text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

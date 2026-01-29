import { Asset } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const statusColors = {
    Active: "bg-green-100 text-green-700 hover:bg-green-200",
    "Pending Approval": "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    Disposal: "bg-red-100 text-red-700 hover:bg-red-200",
    Disposed: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  return (
    <div
      onClick={onClick}
      className="glossy-card rounded-3xl p-6 transition-all duration-500 cursor-pointer group active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {asset.name}
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {asset.tagNumber}
          </p>
        </div>
        <Badge
          className={cn("ml-2 whitespace-nowrap", statusColors[asset.status as keyof typeof statusColors] || "bg-gray-100")}
          variant="secondary"
        >
          {asset.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary/60" />
          <span className="truncate">{asset.branchCode}</span>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <CalendarDays className="w-4 h-4 text-primary/60" />
          <span>{asset.purchaseDate}</span>
        </div>
      </div>
    </div>
  );
}

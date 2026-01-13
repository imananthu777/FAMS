import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Camera, ScanLine } from "lucide-react";
import { useState } from "react";

export default function Scan() {
  const [scanning, setScanning] = useState(false);

  return (
    <Layout title="Scan Asset">
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        <div className="relative w-64 h-64 bg-black/5 rounded-3xl border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
          {scanning ? (
            <>
              <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
                 <div className="w-48 h-48 border-2 border-white/50 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                 </div>
              </div>
              <video className="absolute inset-0 w-full h-full object-cover grayscale" />
              <p className="z-20 text-white font-medium">Scanning...</p>
            </>
          ) : (
            <div className="text-center p-6">
              <ScanLine className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Camera permission required to scan QR codes</p>
            </div>
          )}
        </div>

        <Button 
          size="lg" 
          className="rounded-full px-8 shadow-xl shadow-primary/20"
          onClick={() => setScanning(!scanning)}
        >
          <Camera className="mr-2 w-5 h-5" />
          {scanning ? "Stop Scanning" : "Start Camera"}
        </Button>
      </div>
    </Layout>
  );
}

"use client";

import { ReceiptText, Smartphone } from "lucide-react";
import ReceiptUpload from "@/components/ReceiptUpload";
import MobileReceiptBridge from "@/components/MobileReceiptBridge";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";

export default function ReceiptsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
          <p className="text-foreground-muted text-sm mt-1">
            Upload a receipt photo or hand off to your phone. We will extract items and totals, then you review.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard delay={0} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-foreground-muted" />
                  <h2 className="text-sm font-semibold">Upload</h2>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1">
                  Drag and drop a photo (or browse). Then scan to start extraction.
                </p>
              </div>
            </div>
            <ReceiptUpload />
          </GlassCard>

          <GlassCard delay={80} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-foreground-muted" />
                  <h2 className="text-sm font-semibold">Mobile Upload</h2>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1">
                  Scan the QR code to open a one-time upload page on your phone.
                </p>
              </div>
            </div>
            <MobileReceiptBridge />
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}

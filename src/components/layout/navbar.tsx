"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Upload,
  Briefcase,
  Mic,
  User,
  LineChart,
  Clock,
  Settings
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Studio", href: "/studio", icon: Sparkles },
  { name: "Time Machine", href: "/timemachine", icon: Clock },
  { name: "Insights", href: "/insights", icon: TrendingUp },
  { name: "Stocks", href: "/stocks", icon: LineChart },
  { name: "Imports", href: "/imports", icon: Upload },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { navbarHidden } = useUIStore();

  if (navbarHidden) return null;

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[200px] border-r border-border bg-sidebar flex-col z-50">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center">
          <button
            onClick={() => handleNavClick("/dashboard")}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 p-1">
              <Image src="/logo.png" alt="Scotty's Ledger" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight">Scotty&apos;s Ledger</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors duration-100 cursor-pointer",
                  isActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-foreground-muted hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 pb-3 space-y-0.5 border-t border-border pt-3 mt-auto">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-foreground-muted hover:text-foreground hover:bg-secondary/60 transition-colors duration-100 cursor-pointer">
            <Mic className="w-4 h-4 shrink-0" />
            <span>Voice</span>
          </button>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-3 h-3 text-foreground-muted" />
              </div>
              <span className="text-[13px] text-foreground-muted">Account</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14 border-t border-border bg-background/95 backdrop-blur-sm">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer transition-colors",
                isActive ? "text-foreground" : "text-foreground-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => handleNavClick("/portfolio")}
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer transition-colors",
            pathname === "/portfolio" ? "text-foreground" : "text-foreground-muted"
          )}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}

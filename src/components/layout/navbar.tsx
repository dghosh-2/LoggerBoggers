"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Upload,
  Briefcase,
  User,
  LineChart,
  LogOut,
  ChevronDown,
  UserCircle,
  Target,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Budget", href: "/budget", icon: Target },
  { name: "Studio", href: "/studio", icon: Sparkles },
  { name: "Insights", href: "/insights", icon: TrendingUp },
  { name: "Stocks", href: "/stocks", icon: LineChart },
  { name: "Imports", href: "/imports", icon: Upload },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { navbarHidden } = useUIStore();
  const { user, logout, checkSession, isInitialized } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check session on mount
  useEffect(() => {
    if (!isInitialized) {
      checkSession();
    }
  }, [checkSession, isInitialized]);

  // Prefetch primary routes so nav clicks feel instant (especially in dev where routes compile on-demand).
  useEffect(() => {
    let cancelled = false;

    const prefetchAll = () => {
      if (cancelled) return;
      for (const item of navItems) {
        try {
          router.prefetch(item.href);
        } catch {
          // Ignore: prefetch is best-effort.
        }
      }
    };

    const w = globalThis as any;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(prefetchAll, { timeout: 1500 });
      return () => {
        cancelled = true;
        if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
      };
    }

    const t = setTimeout(prefetchAll, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [router]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (navbarHidden) return null;

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.push('/');
  };

  const handleSwitchAccount = () => {
    setShowUserMenu(false);
    logout();
    router.push('/');
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
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                onMouseEnter={() => router.prefetch(item.href)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors duration-200 cursor-pointer",
                  isActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-foreground-muted hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 pb-3 space-y-0.5 border-t border-border pt-3 mt-auto">
          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  {user ? (
                    <span className="text-xs font-semibold text-primary">
                      {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-3.5 h-3.5 text-foreground-muted" />
                  )}
                </div>
                <div className="text-left">
                  <span className="text-[13px] font-medium block leading-tight">
                    {user ? user.displayName || user.username : 'Guest'}
                  </span>
                  {user && (
                    <span className="text-[10px] text-foreground-muted">@{user.username}</span>
                  )}
                </div>
              </div>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 text-foreground-muted transition-transform",
                showUserMenu && "rotate-180"
              )} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
                >
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-[11px] text-foreground-muted">Signed in as</p>
                        <p className="text-xs font-medium truncate">{user.displayName || user.username}</p>
                      </div>
                      <button
                        onClick={handleSwitchAccount}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground-muted hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                      >
                        <UserCircle className="w-3.5 h-3.5" />
                        Switch Account
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => router.push('/')}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      Sign In
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] text-foreground-muted">Theme</span>
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
              onMouseEnter={() => router.prefetch(item.href)}
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
          onMouseEnter={() => router.prefetch("/portfolio")}
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

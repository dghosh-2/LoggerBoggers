"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Sparkles, 
  TrendingUp, 
  Upload, 
  Briefcase,
  Mic,
  User
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useUIStore } from "@/stores/ui-store";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Studio", href: "/studio", icon: Sparkles },
  { name: "Insights", href: "/insights", icon: TrendingUp },
  { name: "Imports", href: "/imports", icon: Upload },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { navbarHidden } = useUIStore();

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  return (
    <AnimatePresence>
      {!navbarHidden && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 left-0 right-0 z-50"
        >
      <div className="mx-auto max-w-7xl px-6 py-4">
        <nav className="card-elevated flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <button 
            onClick={() => handleNavClick("/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
              <span className="text-lg font-bold text-primary">M</span>
            </div>
            <span className="text-lg font-semibold hidden sm:block">
              MoneyPad
            </span>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <button 
                  key={item.href} 
                  onClick={() => handleNavClick(item.href)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? "text-foreground bg-secondary" 
                      : "text-foreground-muted hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:block">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <button className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <Mic className="w-4 h-4 text-foreground-muted" />
            </button>

            <button className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <User className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
        </nav>
      </div>
    </motion.header>
      )}
    </AnimatePresence>
  );
}

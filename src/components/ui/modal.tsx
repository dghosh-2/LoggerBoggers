"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  hideNavbar?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[90vw] max-h-[90vh]",
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children, 
  size = "md",
  hideNavbar = true
}: ModalProps) {
  const { setNavbarHidden } = useUIStore();

  // Close on escape key and manage navbar visibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      if (hideNavbar) {
        setNavbarHidden(true);
      }
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      if (hideNavbar) {
        setNavbarHidden(false);
      }
    };
  }, [isOpen, onClose, hideNavbar, setNavbarHidden]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full ${sizeClasses[size]} card-elevated overflow-hidden`}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between p-6 border-b border-border">
                <div>
                  {title && <h2 className="text-xl font-semibold">{title}</h2>}
                  {subtitle && <p className="text-sm text-foreground-muted mt-1">{subtitle}</p>}
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 -m-2 rounded-lg hover:bg-secondary transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-foreground-muted" />
                </motion.button>
              </div>
            )}
            
            {/* Content */}
            <div className={`${size === "full" ? "overflow-auto max-h-[calc(90vh-120px)]" : ""}`}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

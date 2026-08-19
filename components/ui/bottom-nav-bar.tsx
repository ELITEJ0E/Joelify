"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  LineChart,
  CreditCard,
  MessageCircle,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  id?: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

const defaultNavItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "portfolio", label: "Portfolio", icon: LineChart },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "rewards", label: "Rewards", icon: Trophy },
  { id: "profile", label: "Profile", icon: User },
];

const MOBILE_LABEL_WIDTH = 72;

export type BottomNavBarProps = {
  items?: NavItem[];
  className?: string;
  activeIndex?: number;
  defaultIndex?: number;
  onItemChange?: (index: number, item: NavItem) => void;
  stickyBottom?: boolean;
};

export function BottomNavBar({
  items = defaultNavItems,
  className,
  activeIndex: controlledIndex,
  defaultIndex = 0,
  onItemChange,
  stickyBottom = false,
}: BottomNavBarProps) {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const handleSelect = (idx: number, item: NavItem) => {
    if (controlledIndex === undefined) {
      setInternalIndex(idx);
    }
    item.onClick?.();
    onItemChange?.(idx, item);
  };

  return (
    <motion.nav
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className={cn(
        "bg-card/90 dark:bg-card/85 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-full flex items-center p-1.5 sm:p-2 shadow-2xl space-x-1 min-w-[300px] max-w-[95vw] h-[52px]",
        stickyBottom && "fixed inset-x-0 bottom-3 mx-auto z-50 w-fit",
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.id || item.label}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "flex items-center gap-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full transition-colors duration-200 relative h-9 sm:h-10 min-w-[40px] sm:min-w-[44px] min-h-[38px] sm:min-h-[40px] max-h-[44px]",
              isActive
                ? "bg-primary/15 dark:bg-primary/20 text-primary dark:text-primary gap-1.5 sm:gap-2 shadow-sm shadow-primary/10"
                : "bg-transparent text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200 hover:bg-muted/50 dark:hover:bg-white/5",
              "focus:outline-none focus-visible:ring-0",
            )}
            onClick={() => handleSelect(idx, item)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            type="button"
          >
            <Icon
              size={20}
              strokeWidth={2}
              aria-hidden
              className={cn("transition-colors duration-200 shrink-0", isActive ? "text-primary" : "")}
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "6px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className={cn("overflow-hidden flex items-center max-w-[72px]")}
            >
              <span
                className={cn(
                  "font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis text-[clamp(0.625rem,0.5263rem+0.5263vw,0.875rem)] leading-[1.8]",
                  isActive ? "text-primary dark:text-primary font-semibold" : "opacity-0",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;

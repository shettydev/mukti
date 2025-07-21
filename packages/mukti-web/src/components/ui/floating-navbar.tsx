// FloatingNav.tsx
"use client";
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: JSX.Element;
  }[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      let direction = current! - scrollYProgress.getPrevious()!;
      // Show when scrolling down, hide when scrolling up
      if (scrollYProgress.get() < 0.05) {
        setVisible(false);
      } else {
        if (direction > 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          initial={{
            opacity: 0,
            y: -100,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: -100,
            opacity: 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className={cn(
            "flex fixed top-4 left-1/2 -translate-x-1/2 z-[5000] rounded-full shadow-lg border border-transparent dark:border-white/[0.2] dark:bg-black bg-white",
            "px-2 py-1 sm:px-6 sm:py-2",
            "items-center justify-center space-x-2 sm:space-x-4",
            "max-w-[95vw] sm:max-w-fit",
            className,
          )}
        >
          {/* Nav links: hidden on mobile, shown on sm+ */}
          <div className="hidden sm:flex items-center space-x-4">
            {navItems.map((navItem, idx) => (
              <Link
                key={`link=${idx}`}
                href={navItem.link}
                className={cn(
                  "flex items-center",
                  "text-neutral-600 dark:text-neutral-50 hover:text-neutral-500 dark:hover:text-neutral-300",
                  "px-2 py-1 rounded-full transition-colors duration-150",
                  "text-sm",
                )}
              >
                <span className="mr-1">{navItem.icon}</span>
                <span>{navItem.name}</span>
              </Link>
            ))}
          </div>
          {/* Join Waitlist button: always visible */}
          <Link
            href="#waitlist"
            className={cn(
              "relative border text-xs sm:text-sm font-medium border-neutral-200 dark:border-white/[0.2]",
              "text-black dark:text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full",
              "transition-colors duration-150",
            )}
          >
            Join Waitlist
            <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
import { BorderBeam } from "../magicui/border-beam";

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactElement;
  }[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current! - scrollYProgress.getPrevious()!;
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
            "flex fixed top-4 left-1/2 -translate-x-1/2 z-[5000] bg-transparent dark:bg-transparent sm:bg-white sm:dark:bg-black shadow-none sm:shadow-lg border-none sm:border sm:border-transparent sm:dark:border-white/[0.2]",
            "px-0 py-0 sm:px-6 sm:py-2",
            "items-center justify-center space-x-2 sm:space-x-4",
            "max-w-full sm:max-w-fit",
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
              "dark:bg-black text-black dark:text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full",
              "transition-colors duration-150",
            )}
          >
            Join Waitlist
            <BorderBeam
              size={50}
              borderWidth={2}
              reverse
              className="from-transparent via-blue-500 to-transparent"
            />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

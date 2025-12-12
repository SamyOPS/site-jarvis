"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ComponentPropsWithoutRef } from "react";

type AnimatedSectionProps = ComponentPropsWithoutRef<"section"> & {
  as?: "div" | "section";
  delay?: number;
};

export function AnimatedSection({
  as = "section",
  delay = 0,
  children,
  className,
  ...props
}: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = as === "div" ? motion.div : motion.section;

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={{
        hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.7,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export function SiteIntroOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        >
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0.02 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />

          <motion.img
            src="/iron.jpg"
            alt="Jarvis Connect"
            className="relative h-20 w-auto object-contain sm:h-24"
            initial={{ scale: 0.75, opacity: 0.95 }}
            animate={{
              scale: 60,
              opacity: 1,
              transition: {
                duration: 1.35,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

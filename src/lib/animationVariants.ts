import { Variants } from "framer-motion";

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export const cardHoverVariant: Variants = {
  initial: { y: 0, scale: 1 },
  hover: {
    y: -3,
    transition: { duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export const buttonPressVariant = {
  whileHover: { y: -1, scale: 1.015, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
};

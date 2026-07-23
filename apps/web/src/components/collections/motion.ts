import type { Transition, Variants } from "framer-motion";

export const DUR = {
  micro: 0.14,
  base: 0.32,
  expressive: 0.55,
} as const;

export const EASE = [0.22, 1, 0.36, 1] as const;

export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 1,
};

export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 1,
};

export const SPRING_HERO: Transition = {
  type: "spring",
  stiffness: 440,
  damping: 36,
  mass: 0.9,
};

export const T = {
  micro: { duration: DUR.micro, ease: EASE } as Transition,
  base: { duration: DUR.base, ease: EASE } as Transition,
  expressive: { duration: DUR.expressive, ease: EASE } as Transition,
};

export const STAGGER = 0.04;
export const STAGGER_MAX_ITEMS = 12;

export function staggerDelay(index: number) {
  return Math.min(index, STAGGER_MAX_ITEMS) * STAGGER;
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...T.base, delay: staggerDelay(i) },
  }),
  exit: { opacity: 0, transition: { duration: 0 } },
};

export const slideUp: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: SPRING_SOFT },
  exit: { y: "100%", transition: { duration: DUR.base, ease: EASE } },
};

export const scrim: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: T.base },
  exit: { opacity: 0, transition: T.base },
};

export const expandIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: SPRING_SOFT },
  exit: { opacity: 0, scale: 0.93, transition: { duration: DUR.base, ease: EASE } },
};

export const settleIn: Variants = {
  hidden: { opacity: 0, scale: 1.08 },
  show: { opacity: 1, scale: 1, transition: SPRING_SOFT },
  exit: { opacity: 0, scale: 1.05, transition: { duration: DUR.base, ease: EASE } },
};

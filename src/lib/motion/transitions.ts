import type { Transition } from "framer-motion";

export const transitions = {
  spring: {
    type: "spring",
    stiffness: 300,
    damping: 24,
  },
  springBouncy: {
    type: "spring",
    stiffness: 500,
    damping: 15,
  },
  springStiff: {
    type: "spring",
    stiffness: 700,
    damping: 30,
  },
  smooth: {
    type: "tween",
    duration: 0.3,
    ease: "easeInOut",
  },
  snappy: {
    type: "tween",
    duration: 0.15,
    ease: [0.25, 0.1, 0.25, 1],
  },
  page: {
    type: "tween",
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1],
  },
} as const satisfies Record<string, Transition>;

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
} as const;

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const;

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
} as const;

export const listContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
} as const;

export const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.spring,
  },
} as const;

export const listItemHorizontal = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.spring,
  },
} as const;

export const dialogOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export const dialogContent = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 16 },
} as const;

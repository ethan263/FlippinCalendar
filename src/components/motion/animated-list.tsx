"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import {
  listContainer,
  listItem,
  listItemHorizontal,
} from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

type ListElement = "ul" | "ol" | "div" | "tbody";
type ItemElement = "li" | "div" | "tr";

type AnimatedListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  itemClassName?: string;
  direction?: "vertical" | "horizontal";
  as?: ListElement;
  itemAs?: ItemElement;
};

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
  direction = "vertical",
  as = "ul",
  itemAs = "li",
}: AnimatedListProps<T>) {
  const reduceMotion = useReducedMotion();
  const List = motion(as);
  const Item = motion(itemAs);
  const itemVariants =
    direction === "horizontal" ? listItemHorizontal : listItem;

  return (
    <List
      variants={listContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className={cn(className)}
    >
      {items.map((item, index) => (
        <Item
          key={keyExtractor(item, index)}
          variants={itemVariants}
          className={cn(itemClassName)}
        >
          {renderItem(item, index)}
        </Item>
      ))}
    </List>
  );
}

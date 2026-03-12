'use client';
 
import * as React from 'react';
import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  type Transition,
} from 'motion/react';
 
import { cn } from '@/lib/utils';
 
type RotatingTextProps = {
  text: string | string[];
  duration?: number;
  transition?: Transition;
  y?: number;
  containerClassName?: string;
} & HTMLMotionProps<'span'>;
 
function RotatingText({
  text,
  y = 20,
  duration = 3000,
  transition = { 
    duration: 0.5, 
    ease: [0.23, 1, 0.32, 1],
    type: 'tween'
  },
  containerClassName,
  ...props
}: RotatingTextProps) {
  const [index, setIndex] = React.useState(0);
 
  React.useEffect(() => {
    if (!Array.isArray(text)) return;
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % text.length);
    }, duration);
    return () => clearInterval(interval);
  }, [text, duration]);
 
  const currentText = Array.isArray(text) ? text[index] : text;
 
  return (
    <span className={cn('overflow-hidden inline-block py-1', containerClassName)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={currentText}
          transition={transition}
          initial={{ opacity: 0, y: -y, filter: 'blur(2px)', scale: 0.98 }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, y: y / 2, filter: 'blur(2px)', scale: 0.98 }}
          style={{ 
            display: 'inline-block', 
            willChange: 'transform, opacity, filter',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased'
          }}
          {...props}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
 
export { RotatingText, type RotatingTextProps };
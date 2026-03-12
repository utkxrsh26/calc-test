"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import styles from './FeatureFlowSection.module.css';

const features = [
  { 
    id: 1, 
    text: "Scan your repo and generate docstrings",
    detail: "AI analyzes your entire codebase structure"
  },
  { 
    id: 2, 
    text: "Build a full dependency graph",
    detail: "Maps all connections between files, functions, and modules"
  },
  { 
    id: 3, 
    text: "Search context instantly in every PR",
    detail: "Find any code reference across your project in milliseconds"
  }
];

const AnimationOne = () => {
  const codeLines = [
    '// Scanning repository...',
    'const x = () => {',
    '  // ... complex logic ...',
    '};',
  ];

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const lineVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{ fontFamily: "'Source Code Pro', monospace", color: '#9CA3AF', width: '100%' }}
    >
      <motion.div variants={containerVariants} initial="initial" animate="animate">
        {codeLines.map((line, i) => (
          <motion.p key={i} variants={lineVariants} style={{ margin: '0.25rem 0' }}>
            {line}
          </motion.p>
        ))}
        <motion.div style={{ display: 'inline-block' }}>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ backgroundColor: '#027FF7', width: '2px', height: '1.2em', display: 'inline-block', verticalAlign: 'text-bottom', marginLeft: '4px' }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const AnimationTwo = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const nodes = gsap.utils.toArray<SVGElement>('.node', svg);
    const lines = gsap.utils.toArray<SVGPathElement>('.line', svg);

    gsap.set(nodes, { opacity: 0, scale: 0.5, transformOrigin: 'center' });
    lines.forEach(line => {
      const length = line.getTotalLength();
      gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
    });

    const tl = gsap.timeline();

    tl.to(nodes, {
      opacity: 1,
      scale: 1,
      stagger: 0.15,
      ease: 'back.out(1.7)',
      duration: 0.4
    }).to(lines, {
      strokeDashoffset: 0,
      stagger: 0.2,
      duration: 0.6,
      ease: 'power1.inOut'
    }, "-=0.5");

    return () => {
      if (tl) {
        tl.kill();
      }
    }
  }, []);

  return (
    <motion.div
      key="anim2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg ref={svgRef} width="250" height="250" viewBox="0 0 100 100">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path className="line" d="M20 50 L 50 20" stroke="#027FF7" strokeWidth="1" fill="none" />
        <path className="line" d="M50 20 L 80 50" stroke="#027FF7" strokeWidth="1" fill="none" />
        <path className="line" d="M80 50 L 50 80" stroke="#027FF7" strokeWidth="1" fill="none" />
        <path className="line" d="M50 80 L 20 50" stroke="#027FF7" strokeWidth="1" fill="none" />
        <path className="line" d="M50 20 L 50 80" stroke="#027FF7" strokeWidth="0.5" fill="none" />
        <circle className="node" cx="20" cy="50" r="5" fill="#027FF7" filter="url(#glow)" />
        <circle className="node" cx="50" cy="20" r="5" fill="#027FF7" filter="url(#glow)" />
        <circle className="node" cx="80" cy="50" r="5" fill="#027FF7" filter="url(#glow)" />
        <circle className="node" cx="50" cy="80" r="5" fill="#027FF7" filter="url(#glow)" />
      </svg>
    </motion.div>
  );
};

const AnimationThree = () => {
  const [text, setText] = useState('');
  const fullText = "find all instances of 'Button'";
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setText(fullText.substring(0, index + 1));
      index++;
      if (index === fullText.length) {
        clearInterval(interval);
      }
    }, 60);
    
    timeoutRef.current = interval;
    
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      key="anim3"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div style={{
        border: '1px solid rgba(2,127,247,0.4)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(0,0,0,0.3)',
        color: '#fff',
        fontFamily: "'Source Code Pro', monospace"
      }}>
        {text}
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: fullText.length * 0.06 }}
          style={{ backgroundColor: '#fff', width: '2px', height: '1em', display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }}
        />
      </div>
      <AnimatePresence>
        {text.length === fullText.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{
              border: '1px solid rgba(2,127,247,0.2)',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: 'rgba(2, 127, 247, 0.1)',
            }}
          >
            <p style={{ color: '#fff', margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>src/components/ui/Button.tsx</p>
            <p style={{ color: '#9CA3AF', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>...export const Button = React.forwardRef(...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FeatureFlowSection = () => {
  const [activeId, setActiveId] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (isInView) {
      intervalRef.current = setInterval(() => {
        setActiveId(prevId => (prevId % features.length) + 1);
      }, 2000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isInView]);

  const renderAnimation = () => {
    switch (activeId) {
      case 1: return <AnimationOne />;
      case 2: return <AnimationTwo />;
      case 3: return <AnimationThree />;
      default: return null;
    }
  };

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.heading}>How It Works</h2>
        <p className={styles.subheading}>
          See your codebase context come alive in three simple steps.
        </p>

        <div className={styles.contentWrapper}>
          <div className={styles.leftColumn}>
            <ul className={styles.featureList} aria-live="polite">
              {features.map((feature) => (
                <li
                  key={feature.id}
                  className={styles.featureItem}
                  onClick={() => setActiveId(feature.id)}
                >
                  <div className={styles.bulletWrapper}>
                    <div className={styles.staticBullet} />
                    {activeId === feature.id && (
                      <motion.div
                        className={styles.activeBullet}
                        layoutId="active-bullet-indicator"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </div>
                  <div className={styles.featureTextWrapper}>
                    <motion.span
                      animate={{ color: activeId === feature.id ? '#FFFFFF' : '#666666' }}
                      transition={{ duration: 0.3 }}
                      className={styles.featureText}
                    >
                      {feature.text}
                    </motion.span>
                    {activeId === feature.id && (
                      <motion.p
                        initial={{ opacity: 0, maxHeight: 0 }}
                        animate={{ opacity: 1, maxHeight: 100 }}
                        exit={{ opacity: 0, maxHeight: 0 }}
                        transition={{ duration: 0.3 }}
                        className={styles.featureDetail}
                      >
                        {feature.detail}
                      </motion.p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.rightColumn}>
            <div className={styles.animationBox}>
              <AnimatePresence mode="wait">
                {renderAnimation()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureFlowSection;

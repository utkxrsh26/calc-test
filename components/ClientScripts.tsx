'use client';

import { useEffect } from 'react';

export function ClientScripts() {
  useEffect(() => {
    // Smooth scroll reveal animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          target.style.opacity = '1';
          target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Animate elements on scroll
    const animateElements = document.querySelectorAll('.feature-card, .content-block, .section-title, .story-card, .integration-card, .ai-feature-card');
    animateElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.opacity = '0';
      element.style.transform = 'translateY(30px)';
      element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(element);
    });

    // Navbar scroll effect - removed to keep glassmorphic effect
    // const navbar = document.querySelector('.navbar') as HTMLElement | null;
    // const handleScroll = () => {
    //   const currentScroll = window.pageYOffset;
    //   if (navbar) {
    //     if (currentScroll > 100) {
    //       navbar.style.background = 'rgba(10, 10, 10, 0.95)';
    //       navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    //     } else {
    //       navbar.style.background = 'rgba(10, 10, 10, 0.8)';
    //       navbar.style.boxShadow = 'none';
    //     }
    //   }
    // };

    // window.addEventListener('scroll', handleScroll);

    // Parallax effect for hero section - optimized with throttling
    const hero = document.querySelector('.hero');
    let parallaxThrottle = 0;
    const handleParallax = () => {
      const now = performance.now();
      if (now - parallaxThrottle < 16) return; // Throttle to ~60fps
      parallaxThrottle = now;
      
      const scrolled = window.pageYOffset;
      const parallax = hero?.querySelector('.hero-visual') as HTMLElement | null;
      if (parallax) {
        parallax.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    };

    window.addEventListener('scroll', handleParallax, { passive: true });

    // Expand button interactions
    const expandButtons = document.querySelectorAll('.expand-btn');
    expandButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.feature-card');
        if (card) {
          card.classList.toggle('expanded');
          btn.textContent = card.classList.contains('expanded') ? '−' : '+';
        }
      });
    });

    // Dots visualization for insights
    const canvas = document.getElementById('dotsCanvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dots: Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string }> = [];
        const numDots = 300;
        
        // Create dots
        for (let i = 0; i < numDots; i++) {
          dots.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            color: `rgba(${100 + Math.random() * 155}, ${100 + Math.random() * 155}, ${200 + Math.random() * 55}, ${Math.random() * 0.5 + 0.3})`
          });
        }
        
        function animateDots() {
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          dots.forEach(dot => {
            dot.x += dot.vx;
            dot.y += dot.vy;
            
            if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
            if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            ctx.fillStyle = dot.color;
            ctx.fill();
          });
          
          dots.forEach((dot, i) => {
            dots.slice(i + 1).forEach(otherDot => {
              const dx = dot.x - otherDot.x;
              const dy = dot.y - otherDot.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 100 && ctx) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(100, 150, 255, ${0.2 * (1 - distance / 100)})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(dot.x, dot.y);
                ctx.lineTo(otherDot.x, otherDot.y);
                ctx.stroke();
              }
            });
          });
          
          requestAnimationFrame(animateDots);
        }
        
        const canvasObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateDots();
              canvasObserver.unobserve(entry.target);
            }
          });
        });
        
        canvasObserver.observe(canvas);
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleParallax);
    };
  }, []);

  return null;
}

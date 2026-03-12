'use client';

import { useEffect, useState } from 'react';
import MergeTimeChart from './MergeTimeChart';
import AIHumanBalanceChart from './AIHumanBalanceChart';
import MergeTimeComparisonChart from './MergeTimeComparisonChart';

export default function CyclesTriageSection() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render the entire section on mobile
  if (mounted && isMobile) {
    return null;
  }

  return (
    <section className="cycles-triage-section">
      <div className="container">
        <h2 className="cycles-triage-section-title">We stand apart</h2>
            <div className="split-layout" style={{marginTop: '4rem'}}>
              <div className="content-block">
                <div className="text-content">
                  <h2 className="section-heading section-heading-green">Codity cuts your merge time</h2>
                  <p>Average PR merge time: Codity vs other tools.</p>
                </div>
                {mounted && !isMobile && (
                  <div className="visual-content">
                    <MergeTimeComparisonChart />
                  </div>
                )}
              </div>

              <div className="content-block">
                <div className="text-content">
                  <h2 className="section-heading section-heading-purple">Smart code analysis</h2>
                  <p>Your early warning system, finding risks before they find you.</p>
                </div>
                {mounted && !isMobile && (
                  <div className="visual-content">
                    <div className="triage-card">
                      <h3>Smart Suggestions</h3>
                      <div className="triage-items">
                        <div className="triage-item">
                          <div className="item-header">
                            <span>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{marginRight: '6px', display: 'inline-block', verticalAlign: 'middle'}}>
                                <rect x="1" y="6" width="12" height="7" rx="0.5" stroke="currentColor" strokeWidth="1"/>
                                <line x1="7" y1="6" x2="7" y2="2" stroke="currentColor" strokeWidth="1"/>
                                <circle cx="7" cy="3.5" r="0.5" fill="currentColor"/>
                              </svg>
                              Potential SQL injection vulnerability
                            </span>
                          </div>
                          <div className="item-meta">
                            <div className="avatar">AI Review</div>
                          </div>
                        </div>
                        <div className="triage-menu">
                          <button className="menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 12L4 8L5.5 6.5L8 9L14.5 2.5L16 4L8 12Z" fill="currentColor"/>
                            </svg>
                            Apply fix
                          </button>
                          <button className="menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" fill="none"/>
                            </svg>
                            View details
                          </button>
                          <button className="menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            Ignore
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
      </div>
    </section>
  );
}

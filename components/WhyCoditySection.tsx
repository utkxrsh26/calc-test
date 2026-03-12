import React from 'react';
import { MessageSquare, Zap, Link2, BarChart3 } from 'lucide-react';

export default function WhyCoditySection() {
  return (
    <section className="why-codity-section">
      <div className="section-container">
        <h2 className="section-title">Why Codity?</h2>
        <p className="section-subtitle">
          Discover the edge that turns code reviews from bottleneck to effortless.
        </p>
        
        <div className="features-grid-4">
          {/* Feature 1 */}
          <div className="feature-card-why">
            <div className="feature-icon-wrapper">
              <MessageSquare className="feature-icon" size={20} />
              <h3 className="feature-title-why">Talk to Your Code</h3>
            </div>
            <div className="feature-visual-why">
              <div className="talk-visual">
                <div className="node-connection">
                  <div className="node-start"></div>
                  <div className="connection-line"></div>
                  <div className="node-end"></div>
                </div>
              </div>
            </div>
            <ul className="feature-list">
              <li>Ask anything.</li>
              <li>Find functions, compare branches, plan new features.</li>
              <li>Instant answers, repo-aware.</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="feature-card-why">
            <div className="feature-icon-wrapper">
              <Zap className="feature-icon" size={20} />
              <h3 className="feature-title-why">Contextually Aware</h3>
            </div>
            <div className="feature-visual-why">
              <div className="codebase-visual">
                <svg width="120" height="100" viewBox="0 0 120 100" className="graph-svg">
                  <circle cx="60" cy="50" r="25" fill="#027FF7" opacity="0.3" />
                  <circle cx="60" cy="50" r="6" fill="#027FF7" />
                  <line x1="60" y1="50" x2="40" y2="30" stroke="#555" strokeWidth="2" />
                  <line x1="60" y1="50" x2="80" y2="30" stroke="#555" strokeWidth="2" />
                  <line x1="60" y1="50" x2="40" y2="70" stroke="#555" strokeWidth="2" />
                  <line x1="60" y1="50" x2="80" y2="70" stroke="#555" strokeWidth="2" />
                  <circle cx="40" cy="30" r="4" fill="#666" />
                  <circle cx="80" cy="30" r="4" fill="#666" />
                  <circle cx="40" cy="70" r="4" fill="#666" />
                  <circle cx="80" cy="70" r="4" fill="#666" />
                </svg>
              </div>
            </div>
            <ul className="feature-list">
              <li>Not just your PR, your entire codebase.</li>
              <li>Structure, patterns, history fully in context.</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="feature-card-why">
            <div className="feature-icon-wrapper">
              <Link2 className="feature-icon" size={20} />
              <h3 className="feature-title-why">Seamless Jira Sync</h3>
            </div>
            <div className="feature-visual-why">
              <div className="jira-sync-visual">
                <div className="sync-flow">
                  <div className="sync-label">Jira</div>
                  <div className="sync-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <div className="sync-icon">
                    <div className="sync-circle"></div>
                  </div>
                  <div className="sync-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <div className="sync-label">Code</div>
                </div>
              </div>
            </div>
            <ul className="feature-list">
              <li>Auto-links tickets, summarizes changes,</li>
              <li>Flags missing features automatically.</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="feature-card-why">
            <div className="feature-icon-wrapper">
              <BarChart3 className="feature-icon" size={20} />
              <h3 className="feature-title-why">Less Noise, More Clarity</h3>
            </div>
            <div className="feature-visual-why">
              <div className="clarity-visual">
                <svg width="120" height="80" viewBox="0 0 120 80" className="chart-svg">
                  <line x1="10" y1="70" x2="10" y2="10" stroke="#027FF7" strokeWidth="2" />
                  <path 
                    d="M 15 60 Q 30 50, 45 55 T 75 45 T 105 40" 
                    stroke="#666" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="3,3"
                  />
                  <path 
                    d="M 15 50 L 35 45 L 55 35 L 75 30 L 95 25" 
                    stroke="#027FF7" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                </svg>
              </div>
            </div>
            <ul className="feature-list">
              <li>Built for focus, not fatigue.</li>
              <li>Only the comments that matter.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

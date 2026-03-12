import React from 'react';
import Image from 'next/image';

export default function WhatIsCoditySection() {
  return (
    <section className="what-is-codity-section">
      <div className="section-container">
        <h2 className="section-title"><span style={{background: 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>code + quality = codity</span></h2>
        <p className="section-subtitle">
          Vibe coding is cool. We make sure your vibes are right.<br />
          <span style={{ color: '#027FF7', fontWeight: '600' }}>Tech debt? Not on our watch.</span>
        </p>
        
        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <h3 className="feature-title">Knows  your codebase like your CTO does</h3>
            <p className="feature-description">
              It understands your codebase’s DNA and gives feedback that feels truly human and contextual.
            </p>
            <div className="feature-visual">
              <div className="code-lines-container">
                <div className="code-line-item" data-line="1">
                  <span className="line-number">1</span>
                  <span className="code-text typing-text"><span className="keyword">function</span> analyzeCode() {'{'}</span>
                </div>
                <div className="code-line-item" data-line="2">
                  <span className="line-number">2</span>
                  <span className="code-text typing-text">  <span className="keyword">const</span> <span className="variable">data</span> = <span className="function">fetchRepo</span>();</span>
                </div>
                <div className="code-line-item" data-line="3">
                  <span className="line-number">3</span>
                  <span className="code-text typing-text">  <span className="keyword">if</span> (<span className="variable">data</span>.<span className="property">isValid</span>) {'{'}</span>
                </div>
                <div className="code-line-item" data-line="4">
                  <span className="line-number">4</span>
                  <span className="code-text typing-text">    <span className="keyword">return</span> <span className="function">processData</span>(<span className="variable">data</span>);</span>
                </div>
                <div className="code-line-item" data-line="5">
                  <span className="line-number">5</span>
                  <span className="code-text typing-text">  {'}'}</span>
                </div>
                <div className="code-line-item" data-line="6">
                  <span className="line-number">6</span>
                  <span className="code-text typing-text">{'}'}</span>
                </div>
                <div className="codity-logo-hover">
                  <Image 
                    src="/logo-main.svg" 
                    alt="Codity Logo" 
                    width={14} 
                    height={14}
                    className="codity-logo-image"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <h3 className="feature-title">Turns messy reviews into structured feedback</h3>
            <p className="feature-description">
              Ultra-relevant feedback so you see what you need to, not noise.
            </p>
            <div className="feature-visual">
              <div className="feedback-container">
                <div className="messy-buttons">
                  <button className="messy-btn messy-btn-1">what is this?</button>
                  <button className="messy-btn messy-btn-2">??</button>
                  <button className="messy-btn messy-btn-3">fix it</button>
                </div>
                <div className="structured-feedback">
                  <div className="structured-item">
                    <span className="check-icon">✓</span>
                    <span>Refactor for clarity</span>
                  </div>
                  <div className="structured-item">
                    <span className="check-icon">✓</span>
                    <span>Add error handling</span>
                  </div>
                  <div className="structured-item">
                    <span className="check-icon">✓</span>
                    <span>Improve performance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <h3 className="feature-title">Helps teams ship cleaner, safer code. Fast.</h3>
            <p className="feature-description">
              Gives your team the confidence to move fast without breaking things.
            </p>
            <div className="feature-visual">
              <div className="ship-code-visual">
                <div className="code-typing-box">
                  <div className="code-box-header">
                    <div className="code-box-dots">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                    <span className="code-box-title">code.js</span>
                  </div>
                  <div className="code-box-content">
                    <div className="typing-code-line">function validate() {'{}'}</div>
                    <div className="typing-code-line">const result = check();</div>
                    <div className="typing-code-line">return result;</div>
                  </div>
                </div>
                <div className="ready-to-ship-badge">
                  <div className="badge-text">Ready to Ship</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

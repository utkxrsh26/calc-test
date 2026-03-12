import Link from 'next/link';
import FeatureFlowSection from '../../components/FeatureFlowSection';
import FeatureWireframeIcon from '@/components/FeatureWireframeIcon';
import { RotatingText } from '@/components/text/rotating-text';

export default function FeaturesPage() {
  return (
    <div className="codity-features-wrapper">
      {/* Core Features */}
      <section className="codity-features">
        <div className="container">
          <div className="codity-section-header">
            <h2 className="codity-section-title">Everything you need to review code{'\u00A0'}
              <span className="logo-blue-word rotating-text-container" style={{ whiteSpace: 'nowrap' }}>
                <RotatingText
                  text={["Safer", "Faster", "Smarter"]}
                  duration={3000}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], type: 'tween' }}
                  y={20}
                  containerClassName="inline-block align-baseline"
                  className="inline-block"
                />
              </span>
            </h2>
            <p className="codity-section-description">
              Powerful features that integrate seamlessly into your development workflow
            </p>
          </div>

          <div className="bento-features-grid" id="bento-grid">
            {/* Feature 1 - Large (Most Important - AI Codebase Awareness) */}
            <div className="bento-feature-card bento-card-large">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="ai" size={48} className="fw-icon fw-ai" animated />
                </div>
                <h3 className="bento-feature-title">You can now talk to your codebase. Not just about your PR but your whole project.</h3>
                <p className="bento-feature-description">
                  Not just your PR your whole project. Structure, patterns, and history fully in context.
                </p>
                <div className="bento-feature-highlight">
                  <div className="bento-stat">
                    <div className="bento-stat-number">100%</div>
                    <div className="bento-stat-label">Codebase Aware</div>
                  </div>
                  <div className="bento-stat">
                    <div className="bento-stat-number">10x</div>
                    <div className="bento-stat-label">Faster Reviews</div>
                  </div>
                </div>
                <ul className="bento-feature-list">
                  <li>Complete project awareness across every file and module</li>
                  <li>Intelligent pattern recognition with adaptive code standards</li>
                  <li>Deep historical context for past changes and decisions</li>
                  <li>Unified multi-repo understanding with seamless linking</li>
                  <li>Smart dependency tracking across systems and services</li>
                  <li>Real-time codebase sync to stay up-to-date with every commit</li>
                  <li>Effortless knowledge sharing across teams and projects</li>
                </ul>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="doc" size={32} className="fw-icon fw-doc" animated />
                </div>
                <h3 className="bento-feature-title">Code Navigation</h3>
                <ul className="bento-feature-list">
                  <li>Instant answers</li>
                  <li>Repo-aware search</li>
                  <li>Context-driven</li>
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="chart" size={32} className="fw-icon fw-chart" animated />
                </div>
                <h3 className="bento-feature-title">Focus, Not Fatigue</h3>
                <ul className="bento-feature-list">
                  <li>Smart filtering</li>
                  <li>Priority alerts</li>
                  <li>Actionable only</li>
                </ul>
              </div>
            </div>

            {/* Feature 4 - Large (Important - Smart Fixes) */}
            <div className="bento-feature-card bento-card-large">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="wrench" size={32} className="fw-icon fw-wrench" animated />
                </div>
                <h3 className="bento-feature-title">Fix Smarter, Not Harder</h3>
                <div className="bento-visual-element">
                  <div className="fix-infographic">
                    <div className="fix-flow">
                      <div className="fix-step">
                        <div className="fix-step-number">1</div>
                        <div className="fix-step-label">Analyze</div>
                      </div>
                      <div className="fix-flow-line"></div>
                      <div className="fix-step">
                        <div className="fix-step-number">2</div>
                        <div className="fix-step-label">Generate</div>
                      </div>
                      <div className="fix-flow-line"></div>
                      <div className="fix-step">
                        <div className="fix-step-number">3</div>
                        <div className="fix-step-label">Apply</div>
                      </div>
                    </div>
                    <div className="fix-metrics">
                      <div className="fix-metric">
                        <span className="fix-metric-value">95%</span>
                        <span className="fix-metric-label">Success</span>
                      </div>
                      <div className="fix-metric">
                        <span className="fix-metric-value">&lt;2s</span>
                        <span className="fix-metric-label">Speed</span>
                      </div>
                      <div className="fix-metric">
                        <span className="fix-metric-value">10K+</span>
                        <span className="fix-metric-label">Monthly</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="bento-feature-list">
                  <li>One-click automated fixes</li>
                  <li>Lint and style guide compliance</li>
                  <li>Context-aware refactoring suggestions</li>
                  <li>Safe code transformations</li>
                  <li>Detailed reasoning for each fix</li>
                </ul>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="jira" size={32} className="fw-icon fw-jira" animated />
                </div>
                <h3 className="bento-feature-title">Jira Sync</h3>
                <ul className="bento-feature-list">
                  <li>Auto ticket linking</li>
                  <li>Change summaries</li>
                  <li>Feature tracking</li>
                </ul>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="list" size={32} className="fw-icon fw-list" animated />
                </div>
                <h3 className="bento-feature-title">Tagged Clarity</h3>
                <ul className="bento-feature-list">
                  <li>Priority tagging</li>
                  <li>Category labels</li>
                  <li>Focused reviews</li>
                </ul>
              </div>
            </div>

            {/* Feature 7 - Regular (no longer tall) */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="lock" size={32} className="fw-icon fw-lock" animated />
                </div>
                <h3 className="bento-feature-title">Security + Logic</h3>
                <ul className="bento-feature-list">
                  <li>Security scanning</li>
                  <li>Logic analysis</li>
                  <li>Early detection</li>
                </ul>
              </div>
            </div>

            {/* Feature 8 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="check" size={50} className="fw-icon fw-check" animated />
                </div>
                <h3 className="bento-feature-title">Collective Memory</h3>
                <ul className="bento-feature-list">
                  <li>Workflow diagrams</li>
                  <li>Feedback loop</li>
                  <li>Unified knowledge</li>
                </ul>
              </div>
            </div>

            {/* Feature 9 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="insights" size={32} className="fw-icon fw-insights" animated />
                </div>
                <h3 className="bento-feature-title">Smart Insights</h3>
                <ul className="bento-feature-list">
                  <li>Performance metrics</li>
                  <li>Health visualization</li>
                  <li>Data-driven calls</li>
                </ul>
              </div>
            </div>

            {/* Feature 10 */}
            <div className="bento-feature-card">
              <div className="bento-card-gradient"></div>
              <div className="bento-card-content">
                <div className="bento-feature-icon">
                  <FeatureWireframeIcon name="cloud" size={48} className="fw-icon fw-cloud" animated />
                </div>
                <h3 className="bento-feature-title">Your Control</h3>
                <p className="bento-feature-description">
                  Cloud or self-hosted same power, your choice.
                </p>
                <ul className="bento-feature-list">
                  <li>Cloud deployment</li>
                  <li>Self-hosted option</li>
                  <li>Full data control</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="codity-how-it-works">
        <div className="container">
          <div className="codity-section-header">
            <h2 className="codity-section-title">Connects</h2>
          </div>
          <div className="codity-steps">
            <div className="codity-step">
              <div className="codity-step-number">1</div>
              <h3 className="codity-step-title">Connect your repository</h3>
              <p className="codity-step-description">
                Install Codity on your GitHub or GitLab repository in seconds.
              </p>
            </div>
            <div className="codity-step">
              <div className="codity-step-number">2</div>
              <h3 className="codity-step-title">Open a pull request</h3>
              <p className="codity-step-description">
                Our AI analyzes your code changes with full codebase context.
              </p>
            </div>
            <div className="codity-step">
              <div className="codity-step-number">3</div>
              <h3 className="codity-step-title">Get instant feedback</h3>
              <p className="codity-step-description">
                Receive intelligent suggestions, fixes, and security alerts in seconds.
              </p>
            </div>
          </div>
          <p className="codity-easy-text"><span className="logo-blue-word">3 steps. It's that easy.</span></p>
        </div>
      </section>

      {/* How It Works - Interactive */}
      <FeatureFlowSection />

      {/* Try Free Section */}
      <section className="features-try-free">
        <div className="container">
          <div className="try-free-content">
            <a href="https://codity.ai" target="_blank" rel="noopener noreferrer" className="try-free-btn">
              Start Your Free 7-Day Trial
            </a>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <Link href="/" className="codity-back-link">← Back to Home</Link>
      </div>
    </div>
  );
}

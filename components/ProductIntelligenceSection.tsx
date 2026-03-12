import Link from 'next/link';

export default function ProductIntelligenceSection() {
  return (
    <section className="product-intelligence-section">
      <div className="container">
        <div className="split-content">
          <div className="content-left">
            <h2>Track review performance and code quality improvements</h2>
            <Link href="#" className="arrow-link">→</Link>
          </div>
          <div className="content-right">
            <div className="chart-visual">
              <svg viewBox="0 0 600 300" className="progress-chart">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#f5a623', stopOpacity: 0.3}} />
                    <stop offset="100%" style={{stopColor: '#f5a623', stopOpacity: 0}} />
                  </linearGradient>
                </defs>
                <path d="M 0,250 Q 100,200 200,180 T 400,120 T 600,80 L 600,300 L 0,300 Z" fill="url(#chartGradient)"/>
                <path d="M 0,250 Q 100,200 200,180 T 400,120 T 600,80" stroke="#f5a623" strokeWidth="3" fill="none" className="animate-path"/>
                <circle cx="600" cy="80" r="6" fill="#f5a623" className="pulse-dot"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

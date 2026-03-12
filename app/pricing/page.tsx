'use client';

import Link from 'next/link';
import BlurText from '@/components/ui/shadcn-io/blur-text';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

export default function PricingPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const getOriginalAnnualPrice = (monthlyPrice: number): number => {
    return monthlyPrice * 12;
  };

  // Fetch currency preference
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/apis/admin/currency');
        const result = await response.json();
        if (result.success) {
          setCurrency(result.currency);
        }
      } catch (error) {
        console.error('Error fetching currency:', error);
      }
    };
    fetchCurrency();
  }, []);

  const USD_TO_INR = 89.3;

  const formatPrice = (price: number): string => {
    if (price === 0) return 'Custom';
    if (currency === 'INR') {
      const inrPrice = price * USD_TO_INR;
      return `₹${inrPrice.toFixed(inrPrice % 1 === 0 ? 0 : 1)}`;
    }
    return `$${price}`;
  };

  const getCurrencyLabel = (): string => {
    return currency === 'INR' ? 'INR' : 'USD';
  };

  return (
    <div className="codity-pricing-wrapper">
      {/* Hero Section */}
      <section className="codity-pricing-hero">
        <div className="container">
          <div className="codity-pricing-hero-content">
            <BlurText
              text="Simple, transparent pricing"
              delay={150}
              animateBy="words"
              direction="top"
              className="codity-pricing-title"
              as="h1"
            />
            <p className="codity-pricing-subtitle">
              Choose the plan that fits your team. Start free, upgrade when you're ready.
            </p>
          </div>
        </div>
      </section>

      {/* Free Trial Banner - At Top */}
      <section className="free-trial-banner-top">
        <div className="container">
          <div className="free-trial-hero-card">
            <div className="beams-container">
              <Beams
                beamWidth={3}
                beamHeight={30}
                beamNumber={20}
                lightColor="#ffffff"
                speed={2}
                noiseIntensity={0}
                scale={1}
                rotation={30}
              />
            </div>
            <div className="trial-hero-content">
              <h2 className="trial-hero-heading">
                All plans include a 7 day free trial
              </h2>
              <p className="trial-hero-subtext">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="codity-pricing-cards">
        <div className="container">
          {/* Billing Toggle - Top Right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', marginTop: '-1rem' }}>
            <div className="billing-toggle">
              <button
                className={`billing-option ${!isAnnual ? 'active' : ''}`}
                onClick={() => setIsAnnual(false)}
              >
                Monthly
              </button>
              <button
                className={`billing-option ${isAnnual ? 'active' : ''}`}
                onClick={() => setIsAnnual(true)}
              >
                Annual
              </button>
            </div>
          </div>
          <div className="pricing-grid">
            
            {/* Standard Plan */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3 className="pricing-card-title">Standard</h3>
                <div className="pricing-card-price">
                  <span className="price-amount">{formatPrice(isAnnual ? 10 : 12)}</span>
                  <span className="price-period">/user/month ({getCurrencyLabel()})</span>
                </div>
                <p className="pricing-card-description">
                  For professional developers
                </p>
              </div>
              <div className="pricing-card-body">
                <ul className="pricing-features">
                  <li><span className="check-icon">✓</span> Unlimited PR reviews</li>
                  <li><span className="check-icon">✓</span> Unlimited repositories</li>
                </ul>
              </div>
              <div className="pricing-card-footer">
                <Link href="/contact" className="pricing-btn primary">
                  Start Free Trial
                </Link>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="pricing-card featured">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-card-header">
                <h3 className="pricing-card-title">Pro</h3>
                <div className="pricing-card-price">
                  <span className="price-amount">{formatPrice(isAnnual ? 24 : 35)}</span>
                  <span className="price-period">/user/month ({getCurrencyLabel()})</span>
                </div>
                <p className="pricing-card-description">
                  For growing engineering teams
                </p>
              </div>
              <div className="pricing-card-body">
                <ul className="pricing-features">
                  <li><span className="check-icon">✓</span> Everything in Standard</li>
                  <li><span className="check-icon">✓</span> Custom review rules</li>
                  <li><span className="check-icon">✓</span> Priority support</li>
                  <li><span className="check-icon">✓</span> JIRA integration</li>
                  <li><span className="check-icon">✓</span> AI chat</li>
                </ul>
              </div>
              <div className="pricing-card-footer">
                <Link href="/contact" className="pricing-btn primary">
                  Start Free Trial
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3 className="pricing-card-title">Enterprise</h3>
                <div className="pricing-card-price">
                  <span className="price-amount">{formatPrice(0)}</span>
                </div>
                <p className="pricing-card-description">
                  For large organizations at scale
                </p>
              </div>
              <div className="pricing-card-body">
                <ul className="pricing-features">
                  <li><span className="check-icon">✓</span> Everything in Premium</li>
                  <li><span className="check-icon">✓</span> On-prem deployment</li>
                  <li><span className="check-icon">✓</span> SSO / SCIM</li>
                  <li><span className="check-icon">✓</span> SLA-backed uptime</li>
                  <li><span className="check-icon">✓</span> Dedicated support team</li>
                  <li><span className="check-icon">✓</span> Custom integrations</li>
                </ul>
              </div>
              <div className="pricing-card-footer">
                <Link href="/contact" className="pricing-btn purple">
                  Contact Sales
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="codity-pricing-faq">
        <div className="container">
          <div className="faq-header">
            <h2 className="faq-title">Frequently asked questions</h2>
          </div>
          <div className="faq-accordion">
            {[
              {
                question: "How does Codity integrate with my existing workflow?",
                answer: "Codity plugs directly into GitHub, GitLab, and Bitbucket. Once enabled, it automatically reviews every pull request and delivers instant feedback on code quality, security issues, and potential bugs — with zero changes to your current workflow."
              },
              {
                question: "Is my code secure with Codity? Do you store my source code?",
                answer: "Yes, your code is secure. Codity analyzes your code in real time and never stores the actual code files on the servers. All our network calls are also encrypted."
              },
              {
                question: "Can I try Codity before committing to a paid plan?",
                answer: "Absolutely. You get a 7-day free trial with full access to all features without any credit card requirement."
              },
              {
                question: "What kind of support do you offer?",
                answer: "We offer comprehensive support including in-app chat, email support, integration help, and onboarding for teams. Enterprise customers also get a dedicated success manager."
              },
              {
                question: "How does pricing work for teams?",
                answer: "Pricing is billed per active developer per month. You only pay for members who actively use Codity, and you can add or remove seats anytime. Enterprise plans and volume pricing are available on request."
              }
            ].map((faq, index) => (
              <div key={index} className={`faq-item ${openFAQ === index ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => toggleFAQ(index)}>
                  {faq.question}
                  <span className="faq-icon">{openFAQ === index ? '−' : '+'}</span>
                </button>
                {openFAQ === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
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

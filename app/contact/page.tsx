'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContactPage() {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  const messages = [
    "Navigate your code effortlessly, chat with your codebase to eliminate confusion and wasted time.",
    "Fits right into your existing workflow without any hassle.",
    "Cut through the noise for a clean, focused code review experience.",
    "Unlock deep insights into your codebase with key performance metrics, visual health overviews, and smart, data-backed decisions.",
    "Stay in control, choose cloud or self-hosted with the same powerful features, your call."
  ];

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);


  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail()) return;

    setIsSubmitting(true);
    setSubmitError('');
    setError('');

    try {
      const payload = {
        contact: {
          email: email,
        },
      };

      const response = await fetch('/apis/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      setSubmitStatus('success');
      // Redirect to dashboard after successful submission
      setTimeout(() => {
        window.location.href = 'https://dashboard.codity.ai/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      // Check if user is already registered - show "Email already exists" message
      if (errorMessage.toLowerCase().includes('already') || 
          errorMessage.toLowerCase().includes('taken') ||
          errorMessage.toLowerCase().includes('exists')) {
        setSubmitError('Email already exists');
        setError('Email already exists');
        return;
      }
      
      // Format user-friendly error message for other errors
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.toLowerCase().includes('email')) {
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('format')) {
          userFriendlyMessage = 'Please enter a valid email address (e.g., name@company.com).';
        } else {
          userFriendlyMessage = 'There was an issue with your email. Please check and try again.';
        }
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        userFriendlyMessage = 'Something went wrong. Please try again or contact support.';
      }
      
      setSubmitError(userFriendlyMessage);
      setError(userFriendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) {
      setError('');
    }
    if (submitStatus === 'error') {
      setSubmitStatus('idle');
      setSubmitError('');
    }
  };

  const renderForm = () => {
    if (submitStatus === 'success') {
      return (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="form-step success-step"
        >
          <motion.div className="success-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <motion.circle
                cx="40"
                cy="40"
                r="38"
                stroke="#027FF7"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <motion.path
                d="M25 40L35 50L55 30"
                stroke="#027FF7"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>
          <h2 className="success-title">Thank you!</h2>
          <p className="success-message">
            We've received your email and will get back to you shortly.
          </p>
          <div className="success-summary">
            <div className="summary-item">
              <span className="summary-label">Email:</span>
              <span className="summary-value">{email}</span>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Back to Home
          </button>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="form"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="form-step"
      >
        <h2 className="step-title">Get in touch</h2>
        <p className="step-subtitle">Enter your email and we'll reach out to you</p>
        <div className="form-fields">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={error ? 'error' : ''}
              placeholder="john@company.com"
              autoFocus
            />
            {error && <span className="error-message">{error}</span>}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="arc-contact-page">
      {/* Left Panel */}
      <div className="contact-left-panel">
        <div className="gradient-orb"></div>
        <div className="gradient-orb-2"></div>
        <div className="left-panel-content">
          <div className="brand">
            <Image 
              src="/logo-main.svg" 
              alt="Codity Logo" 
              width={32} 
              height={37} 
              style={{width: '32px', height: 'auto'}}
            />
            <h1>codity.ai</h1>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="rotating-message"
            >
              <h2 className="message-text">{messages[currentMessage]}</h2>
            </motion.div>
          </AnimatePresence>

          <div className="message-dots">
            {messages.map((_, index) => (
              <div
                key={index}
                className={`dot ${currentMessage === index ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="contact-right-panel">
        <div className="form-container">
          <AnimatePresence mode="wait">
            {renderForm()}
          </AnimatePresence>

          {submitStatus !== 'success' && (
            <>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="submit-error"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 5V9M9 12V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {submitError}
                </motion.div>
              )}

              <div className="form-actions">
                <button
                  onClick={handleSubmit}
                  className={`btn-primary ${isSubmitting ? 'loading' : ''} ${submitStatus === 'error' ? 'error' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      Sending...
                    </>
                  ) : submitStatus === 'error' ? (
                    'Try again'
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Call CTA */}
      <div className="mobile-call-cta">
        <a href="tel:+18333172175" className="mobile-call-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Call Us
        </a>
      </div>
    </div>
  );
}

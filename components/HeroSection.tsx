'use client';

import Image from 'next/image';
import React from 'react';
import { FaGithub, FaGitlab, FaJira } from 'react-icons/fa';
import BlurText from '@/components/ui/shadcn-io/blur-text';
import { RotatingText } from '@/components/text/rotating-text';

export default function HeroSection() {
  return (
    <section className="hero-codity">
      <div className="hero-main-section">
        <div className="hero-content-split">
          <div className="hero-content-wrapper">
            <div className="hero-tagline-container">
              <h1 className="hero-main-title">
                Agentic AI Code Reviewer, minus the <span className="text-white">noise</span>.
              </h1>
            </div>
            <div className="hero-cta-buttons">
              <a href="/contact" className="btn-hero-primary">Book a Demo</a>
              <a href="/contact" className="btn-hero-secondary-new">Start Free Trial</a>
            </div>
            <p className="hero-trial-text">✓ Free 7-day trial • ✓ No credit card required</p>
          </div>
          <div className="hero-logo-section">
            <div className="hero-logo-aura">
              <Image
                src="/logo-main.svg"
                alt="Codity Logo"
                width={200}
                height={230}
                priority
                className="hero-floating-logo"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="hero-integrations-section">
        <p className="integration-banner-text">
          TRUSTED ON PLATFORMS
        </p>
        <div className="integration-logos">
          <a href="https://github.com/login/oauth/authorize?client_id=Ov23liJzBCaiqKvK9RjX&scope=read:org,repo" target="_blank" rel="noopener noreferrer" className="integration-icon-new" title="GitHub">
            <FaGithub size={32} />
          </a>
          <a href="https://gitlab.com/oauth/authorize?client_id=df87a2baab5f6c4a4dd0c6a5883390b02c3536db1bee889d49741610f2ba5048&redirect_uri=https://dashboard.codity.ai/gitlab/callback&response_type=code&scope=read_user+read_api" target="_blank" rel="noopener noreferrer" className="integration-icon-new" title="GitLab">
            <FaGitlab size={32} />
          </a>
          <a href="https://www.atlassian.com/software/jira" target="_blank" rel="noopener noreferrer" className="integration-icon-new" title="Jira">
            <FaJira size={32} />
          </a>
        </div>
      </div>
    </section>
  );
}
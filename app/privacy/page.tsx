import LegalPageTemplate from '@/components/LegalPageTemplate';

const sections = [
  {
    title: 'Information we collect',
    items: [
      {
        title: 'Workspace & billing data',
        description: 'Company name, email addresses, payment method, and usage metadata needed to operate your subscription.',
      },
      {
        title: 'Repository context',
        description:
          'When you connect Git providers we ingest pull request diffs, comments, and metadata required for automated reviews. We never index entire repositories outside of the scopes you approve.',
      },
      {
        title: 'Product analytics',
        description:
          'We log feature usage, performance metrics, and crash reports to improve reliability. You can opt out of analytics at the workspace level.',
      },
    ],
  },
  {
    title: 'How we use your data',
    bullets: [
      'To analyze pull requests and generate review suggestions with Codity AI models.',
      'To personalize dashboards, alerts, and onboarding based on team behavior.',
      'To detect abuse, spam, or behavior that violates our Terms of Use.',
      'To comply with legal obligations, including tax reporting and security disclosures.',
    ],
  },
  {
    title: 'AI processing',
    body:
      'Codity.ai uses a mix of proprietary and partner LLMs. Customer code is encrypted in transit, processed ephemerally, and deleted once a response is returned.',
    bullets: [
      'We do not use your code to train public versions of foundational models.',
      'Enterprise plans include SOC 2 and GDPR-compliant data handling commitments.',
      'Redaction and repository allowlists let you control exactly what Codity can inspect.',
    ],
  },
  {
    title: 'Data retention & security',
    body:
      'Workspace data is stored in AWS with encryption at rest (AES-256). Backups are retained for 30 days to recover from disaster scenarios.',
    bullets: [
      'Access to production systems is protected with MFA, hardware keys, and logging.',
      'Audit logs for code reviews are retained for at least 12 months.',
      'You may request deletion of identifiable data at any time by emailing privacy@codity.ai.',
    ],
  },
  {
    title: 'Your rights & controls',
    bullets: [
      'Export your workspace activity and billing history from the dashboard.',
      'Request corrections or deletion of personal data via privacy@codity.ai.',
      'Execute Data Processing Agreements (DPA) for GDPR and HIPAA compliance.',
      'Appeal automated decisions related to account suspensions.',
    ],
    note: 'We respond to all privacy requests within 30 days, or sooner when mandated by local regulations.',
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageTemplate
      title="Privacy Policy"
      subtitle="Transparency about what data Codity.ai collects, how it is used, and the controls you have."
      lastUpdated="November 25, 2025"
      sections={sections}
      badgeLabel="Privacy"
    />
  );
}


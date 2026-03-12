import LegalPageTemplate from '@/components/LegalPageTemplate';

const sections = [
  {
    title: 'Acceptance of terms',
    body:
      'By creating a Codity.ai workspace, completing the checkout flow, or accessing our APIs you agree to these Terms and Conditions. If you are using Codity on behalf of a company, you confirm that you have authority to bind that entity.',
    bullets: [
      'Codity.ai is provided “as is” while we continue to iterate rapidly.',
      'We may update these terms to reflect new features or regulations. Continued use of the product after changes go live constitutes acceptance.',
    ],
  },
  {
    title: 'Account responsibilities',
    items: [
      {
        title: 'Accurate information',
        description: 'Keep billing, security contact, and workspace metadata up to date so we can reach you about incidents or renewals.',
      },
      {
        title: 'Access control',
        description:
          'Only invite team members who are authorized to view your repositories. You are responsible for managing permissions inside GitHub, GitLab, or Bitbucket.',
      },
      {
        title: 'Security best practices',
        description:
          'Enable SSO or SAML whenever possible, rotate API tokens, and notify us immediately of any suspected unauthorized access.',
      },
    ],
  },
  {
    title: 'Acceptable use policy',
    bullets: [
      'Do not submit code or data that you are not legally permitted to share.',
      'Automated scanning or benchmarking of the platform is prohibited unless approved in writing.',
      'You may not resell Codity.ai or expose our responses inside another commercial product without a partner agreement.',
      'Feedback or suggestions you provide can be used to improve Codity.ai without obligation.',
    ],
    note: 'We reserve the right to suspend workspaces that violate the policy to protect the platform for all teams.',
  },
  {
    title: 'Intellectual property',
    items: [
      {
        title: 'Your code and data',
        description: 'You retain ownership of the repositories you connect. Codity.ai processes code ephemerally and never sells it.',
      },
      {
        title: 'Our technology',
        description:
          'All models, prompts, UI components, and documentation remain the property of Codity Inc. No license is granted beyond what is necessary to use the service.',
      },
      {
        title: 'Brand usage',
        description: 'You may reference Codity.ai publicly, but please use approved assets from our brand kit.',
      },
    ],
  },
  {
    title: 'Service availability & SLA',
    body:
      'We target 99.5% monthly uptime. For Enterprise agreements with a signed SLA, credits are issued when availability drops below the contracted threshold.',
    bullets: [
      'Planned maintenance is announced at least 48 hours in advance.',
      'Emergency maintenance may occur to mitigate security issues.',
      'We rely on upstream services (e.g., OpenAI, Anthropic, Vercel). Their incidents may affect Codity.ai.',
    ],
  },
  {
    title: 'Termination & governing law',
    body:
      'Either party may terminate the agreement with written notice. We may suspend access immediately if you breach these terms or create risk to the platform.',
    bullets: [
      'Upon termination you remain responsible for unpaid fees.',
      'We will delete or export customer data within 30 days, unless legal obligations dictate otherwise.',
      'These terms are governed by the laws of the State of Delaware, USA. Disputes will be resolved in Delaware courts unless both parties agree to arbitration.',
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalPageTemplate
      title="Terms & Conditions"
      subtitle="The rules of the road for using Codity.ai across your engineering workflow."
      lastUpdated="November 25, 2025"
      sections={sections}
      badgeLabel="Legal"
    />
  );
}


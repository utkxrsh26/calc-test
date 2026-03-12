import LegalPageTemplate from '@/components/LegalPageTemplate';

const sections = [
  {
    title: 'Digital fulfillment only',
    body:
      'Codity.ai is a fully hosted platform. We do not ship physical media, hardware keys, or printed materials. All access is delivered digitally through our dashboard and integrations.',
    bullets: [
      'New workspaces are provisioned instantly once payment is confirmed.',
      'Repository analysis begins as soon as you install the GitHub, GitLab, or Bitbucket application.',
      'Any enablement content (playbooks, SOC 2 artifacts, DPIAs) is delivered via secure download links.',
    ],
  },
  {
    title: 'Provisioning timelines',
    items: [
      {
        title: 'Self-serve plans',
        description:
          'Most customers are live within 5 minutes. Seats, AI credits, and integrations can be self-managed inside the dashboard.',
      },
      {
        title: 'Enterprise onboarding',
        description:
          'Dedicated onboarding kicks off within 1 business day after paperwork is signed. We coordinate SSO, SCIM, and network allowlists.',
      },
      {
        title: 'Professional services',
        description:
          'Implementation packages or model fine-tuning schedules are agreed on in your statement of work and tracked in our success portal.',
      },
    ],
  },
  {
    title: 'Regional availability',
    body:
      'Codity.ai runs on top of globally distributed infrastructure. Choose the region that keeps code closest to your team and compliance requirements.',
    bullets: [
      'Primary regions: US-East (N. Virginia), EU-West (Frankfurt), AP-Southeast (Singapore).',
      'Enterprise customers can request single-tenant deployments or VPC peering.',
      'We follow SOC 2 Type II, GDPR, and HIPAA controls; regional addenda are available on request.',
    ],
  },
  {
    title: 'Support during delivery',
    body: 'Our support engineers monitor provisioning events 24/7.',
    bullets: [
      'If automated onboarding fails, we will reach out proactively via the workspace owner email.',
      'You can open a ticket at support@codity.ai or through the in-app messenger for faster triage.',
      'Status updates for ongoing incidents are posted at status.codity.ai.',
    ],
  },
  {
    title: 'No customs or duties',
    body:
      'Because Codity.ai does not ship physical goods, no customs paperwork, import fees, or duties apply. Taxes are calculated based on your billing address and surfaced during checkout.',
  },
];

export default function ShippingPage() {
  return (
    <LegalPageTemplate
      title="Shipping & Delivery"
      subtitle="How Codity.ai provisions access, delivers onboarding assets, and keeps your workspace online worldwide."
      lastUpdated="November 25, 2025"
      sections={sections}
      badgeLabel="Operations"
    />
  );
}


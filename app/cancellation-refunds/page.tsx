import LegalPageTemplate from '@/components/LegalPageTemplate';

const sections = [
  {
    title: 'Subscription model',
    body:
      'Codity.ai is sold as a recurring SaaS subscription. Seats are billed at the start of each billing cycle and stay active until you downgrade or cancel.',
    items: [
      {
        title: 'Monthly plans',
        description:
          'Billed every 30 days. You can cancel any time before the next renewal and keep access through the end of the paid period.',
      },
      {
        title: 'Annual agreements',
        description:
          'Billed once per year for the committed seat count. Annual plans renew automatically unless you provide a written cancellation notice at least 30 days before renewal.',
      },
    ],
  },
  {
    title: 'Cancellation windows',
    bullets: [
      'You can cancel from the dashboard or by emailing billing@codity.ai. The change becomes effective at the next renewal date.',
      'Seat reductions on annual agreements take effect at the next term renewal.',
      'Pausing a workspace is not supported. Please cancel and reactivate when you are ready.',
    ],
    note: 'We always send renewal reminders to the billing contact on file. Please keep that address current.',
  },
  {
    title: 'Refund eligibility',
    body: 'We aim to be fair and transparent. Refunds are evaluated on a case-by-case basis and may be issued when:',
    items: [
      {
        title: 'Duplicate charges',
        description: 'You were charged twice for the same billing period because of a system error.',
      },
      {
        title: 'Confirmed platform outage',
        description:
          'A verified Codity.ai incident prevented you from using the product for more than 48 consecutive hours.',
      },
      {
        title: 'Early cancellation within 72 hours',
        description:
          'New subscriptions cancelled within 72 hours of purchase that have not run production workloads are eligible for a full refund.',
      },
    ],
    note:
      'Refunds are not provided for partial months of service, unused seats, or charges older than one billing cycle unless required by local law.',
  },
  {
    title: 'How to request a refund',
    body: 'Collect the following information so our billing team can review the request quickly:',
    bullets: [
      'Workspace name and invoice ID',
      'Reason for cancellation or refund request',
      'Screenshots or logs (if the request is related to downtime or defects)',
      'Proof that seats were unused (optional but helpful)',
    ],
    note: 'Send the details to billing@codity.ai from the owner email on file. We respond within two business days.',
  },
  {
    title: 'Non-refundable items',
    bullets: [
      'Professional services, onboarding, or credits purchased for AI fine-tuning',
      'Marketplace purchases fulfilled by partners',
      'Any usage fees incurred before the cancellation date',
    ],
    note: 'If you believe a charge was made in error, contact us immediately so we can investigate.',
  },
];

export default function CancellationRefundsPage() {
  return (
    <LegalPageTemplate
      title="Cancellation & Refunds"
      subtitle="We believe in flexible billing and want you to feel confident about every Codity.ai subscription."
      lastUpdated="November 25, 2025"
      sections={sections}
      badgeLabel="Billing"
    />
  );
}


import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-legal">
          <ul className="footer-legal-list">
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms-and-conditions">Terms &amp; Conditions</Link></li>
            <li><Link href="/cancellation-refunds">Cancellation &amp; Refunds</Link></li>
            <li><Link href="/shipping">Shipping &amp; Delivery</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

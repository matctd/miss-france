import { APP_VERSION } from '@/lib/version';
import { LABELS } from '@/lib/labels';

export function Footer() {
  return (
    <footer className="footer">
      <p>Miss Pronos v{APP_VERSION} · © 2026 — {LABELS.footer.privateUse}</p>
      <p className="credit">📸 {LABELS.footer.photoCredit}</p>
    </footer>
  );
}

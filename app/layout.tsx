import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudyForge — AI Exam Prep',
  description: 'Turn study material into exam questions.',
  authors: [{ name: 'Reyansh Gupta' }],
  creator: 'Reyansh Gupta',
  publisher: 'Reyansh Gupta',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexusTech Online Store — AI Customer Support Agent',
  description:
    'AI-Powered E-Commerce Store with automated policy enforcement and Google Sheets inventory integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


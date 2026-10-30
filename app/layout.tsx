import type { Metadata } from 'next';
import { Figtree, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { OrbitProvider } from '@/context/OrbitContext';
import { ToolMarketplaceModal } from '@/components/workspace/ToolMarketplaceModal';
import { VmDesktopModal } from '@/components/workspace/VmDesktopModal';
import { ToastViewport } from '@/components/workspace/ToastViewport';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Orbit — AI Agent & Cloud VM Automation Platform',
  description:
    'Full-stack AI Agent SaaS platform with cloud VM desktop sandboxes, tool integrations (Gmail, Slack, GitHub, Notion), recurring Inngest routine scheduler, and interactive execution logs.',
  openGraph: {
    title: 'Orbit — AI Agent & Cloud VM Automation Platform',
    description:
      'Full-stack AI Agent SaaS platform with cloud VM desktop sandboxes, tool integrations (Gmail, Slack, GitHub, Notion), recurring Inngest routine scheduler, and interactive execution logs.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbit — AI Agent & Cloud VM Automation Platform',
    description:
      'Full-stack AI Agent SaaS platform with cloud VM desktop sandboxes, tool integrations (Gmail, Slack, GitHub, Notion), recurring Inngest routine scheduler, and interactive execution logs.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${jetbrainsMono.variable}`}>
      <body
        suppressHydrationWarning
        className={`${figtree.className} bg-white text-slate-900 antialiased`}
      >
        <OrbitProvider>
          {children}
          <ToolMarketplaceModal />
          <VmDesktopModal />
          <ToastViewport />
        </OrbitProvider>
      </body>
    </html>
  );
}

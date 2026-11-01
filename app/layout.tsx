import type { Metadata } from 'next';
import './globals.css';
import { OrbitProvider } from '@/context/OrbitContext';
import { ToolMarketplaceModal } from '@/components/workspace/ToolMarketplaceModal';
import { VmDesktopModal } from '@/components/workspace/VmDesktopModal';
import { ToastViewport } from '@/components/workspace/ToastViewport';

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
    <html lang="en">
      <body
        suppressHydrationWarning
        className="bg-white font-sans text-slate-900 antialiased"
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

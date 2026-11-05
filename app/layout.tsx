import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { OrbitProvider } from '@/context/OrbitContext';
import { ToolMarketplaceModal } from '@/components/workspace/ToolMarketplaceModal';
import { VmDesktopModal } from '@/components/workspace/VmDesktopModal';
import { CommandPaletteModal } from '@/components/workspace/CommandPaletteModal';
import { ToastViewport } from '@/components/workspace/ToastViewport';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
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
    <html
      lang="fr"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#FAFBFD] font-sans text-[#090D16] antialiased selection:bg-slate-900 selection:text-white"
      >
        <OrbitProvider>
          {children}
          <CommandPaletteModal />
          <ToolMarketplaceModal />
          <VmDesktopModal />
          <ToastViewport />
        </OrbitProvider>
      </body>
    </html>
  );
}

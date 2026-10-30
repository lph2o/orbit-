import React from 'react';
import { AppSidebar } from '@/components/workspace/AppSidebar';
import { WorkspaceAuthGate } from '@/components/workspace/WorkspaceAuthGate';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceAuthGate>
      <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
        <AppSidebar />
        <main className="flex-1 min-w-0 h-screen overflow-y-auto">{children}</main>
      </div>
    </WorkspaceAuthGate>
  );
}

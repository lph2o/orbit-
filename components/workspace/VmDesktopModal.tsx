'use client';

import React from 'react';
import { useOrbit } from '@/context/OrbitContext';
import { VmDesktop } from '@/components/workspace/VmDesktop';

export function VmDesktopModal() {
  const { activeVmModalAgentId, closeVmModal, agents } = useOrbit();

  const agent = agents.find((a) => a.agentId === activeVmModalAgentId);
  if (!activeVmModalAgentId || !agent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-1 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="VM Desktop Environment"
    >
      <div className="h-[96dvh] sm:h-[92vh] w-full max-w-[1380px]">
        <VmDesktop agentId={activeVmModalAgentId} onClose={closeVmModal} />
      </div>
    </div>
  );
}

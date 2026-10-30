'use client';

import React from 'react';
import {
  Mail,
  Hash,
  GitPullRequest,
  FileText,
  Calendar,
  FileSpreadsheet,
  Inbox,
  MessageSquare,
  MessageCircle,
  Layers,
  Video,
  CheckSquare,
  Wrench,
} from 'lucide-react';
import { getToolBySlug } from '@/lib/orbit-logic';

export function ToolIcon({
  slug,
  className = 'h-4 w-4',
}: {
  slug: string;
  className?: string;
}) {
  const clean = (slug || '').toLowerCase();
  const tool = getToolBySlug(clean);
  const color = tool?.accentColor || '#334155';

  switch (clean) {
    case 'gmail':
      return <Mail className={className} style={{ color }} />;
    case 'slack':
      return <Hash className={className} style={{ color }} />;
    case 'github':
      return <GitPullRequest className={className} style={{ color }} />;
    case 'notion':
      return <FileText className={className} style={{ color }} />;
    case 'google_calendar':
      return <Calendar className={className} style={{ color }} />;
    case 'google_docs':
      return <FileSpreadsheet className={className} style={{ color }} />;
    case 'outlook':
      return <Inbox className={className} style={{ color }} />;
    case 'reddit':
      return <MessageSquare className={className} style={{ color }} />;
    case 'discord':
      return <MessageCircle className={className} style={{ color }} />;
    case 'linear':
      return <Layers className={className} style={{ color }} />;
    case 'youtube':
      return <Video className={className} style={{ color }} />;
    case 'clickup':
      return <CheckSquare className={className} style={{ color }} />;
    default:
      return <Wrench className={className} style={{ color }} />;
  }
}

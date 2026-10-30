import {
  AgentChatMessage,
  AgentConfig,
  AgentRoutine,
  RoutineExecution,
} from './types';
import { buildDiceBearAvatarUrl, computeNextRunAt } from './orbit-logic';

const SEED_BASE_MS = Date.parse('2026-10-30T20:00:00.000Z');

export const DEMO_AGENTS: AgentConfig[] = [
  {
    agentId: 'agent_mickey_daily',
    ownerId: 'demo_user_orbit',
    name: 'Mickey — Daily Briefer',
    description:
      'Summarizes top 5 unread Gmail messages every morning, posts executive digests to #new-channel on Slack, and runs Google News research via the E2B Cloud VM Desktop.',
    agentImage: buildDiceBearAvatarUrl('mickey-orbit-v1'),
    tools: ['gmail', 'slack', 'google_calendar'],
    composioSessionId: 'sess_comp_mickey_8841',
    sandboxId: 'sbx_e2b_mickey_902a',
    vmStatus: 'active',
    vmLastActive: new Date(SEED_BASE_MS).toISOString(),
    isActive: true,
    createdAt: new Date(SEED_BASE_MS - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(SEED_BASE_MS).toISOString(),
  },
  {
    agentId: 'agent_code_reviewer',
    ownerId: 'demo_user_orbit',
    name: 'AI PR Reviewer Pro',
    description:
      'Monitors GitHub pull requests, runs security scans and line-by-line diff explanations, and posts review change tags to Slack #engineering-alerts.',
    agentImage: buildDiceBearAvatarUrl('reviewer-pro-v2'),
    tools: ['github', 'slack', 'linear'],
    composioSessionId: 'sess_comp_reviewer_4410',
    sandboxId: 'sbx_e2b_reviewer_311c',
    vmStatus: 'paused',
    vmLastActive: new Date(SEED_BASE_MS - 15 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date(SEED_BASE_MS - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(SEED_BASE_MS - 60 * 60 * 1000).toISOString(),
  },
  {
    agentId: 'agent_youtube_scout',
    ownerId: 'demo_user_orbit',
    name: 'YouTube & Reddit Scout',
    description:
      'Tracks trending AI engineering topics across Reddit and YouTube, compiles structured research briefs into Notion and Google Docs.',
    agentImage: buildDiceBearAvatarUrl('youtube-scout-v3'),
    tools: ['reddit', 'youtube', 'notion', 'google_docs'],
    composioSessionId: 'sess_comp_scout_7129',
    sandboxId: 'sbx_e2b_scout_778f',
    vmStatus: 'inactive',
    vmLastActive: '',
    isActive: true,
    createdAt: new Date(SEED_BASE_MS - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(SEED_BASE_MS - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEMO_ROUTINES: Record<string, AgentRoutine[]> = {
  agent_mickey_daily: [
    {
      routineId: 'routine_unread_gmail_slack',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      name: 'Daily Unread Email Summary to Slack',
      goal: 'Summarize top 5 unread Gmail emails and post digest to #new-channel every morning.',
      instructions:
        'Fetch top 5 unread emails from connected Gmail account, extract sender, subject, and key action items, and post a structured summary to #new-channel on Slack.',
      frequency: 'daily',
      time: '08:00',
      timezone: 'America/Los_Angeles',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      tools: ['gmail', 'slack'],
      targetChannel: '#new-channel',
      isActive: true,
      nextRunAt: computeNextRunAt('daily', '08:00'),
      lastRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      routineId: 'routine_google_news_vm',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      name: 'Daily Google News AI Digest via Cloud VM',
      goal: 'Open E2B Cloud VM Chrome browser, scrape top 5 AI news from Google News, and post to #new-channel.',
      instructions:
        'Activate Cloud VM Desktop sandbox, launch Chrome to news.google.com, extract the top 5 latest AI engineering stories, and send digest to #new-channel on Slack.',
      frequency: 'weekdays',
      time: '09:00',
      timezone: 'America/Los_Angeles',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      tools: ['slack'],
      targetChannel: '#new-channel',
      isActive: true,
      nextRunAt: computeNextRunAt('weekdays', '09:00', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      lastRunAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_code_reviewer: [
    {
      routineId: 'routine_pr_security_audit',
      agentId: 'agent_code_reviewer',
      ownerId: 'demo_user_orbit',
      name: 'Morning GitHub PR Security & Diff Audit',
      goal: 'Scan open GitHub PRs for leaked keys or schema bugs and post summary to #engineering-alerts.',
      instructions:
        'Inspect all open pull requests on GitHub, verify schema consistency and secret hygiene, and post line-by-line review notes to #engineering-alerts on Slack.',
      frequency: 'weekdays',
      time: '08:30',
      timezone: 'America/Los_Angeles',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      tools: ['github', 'slack'],
      targetChannel: '#engineering-alerts',
      isActive: true,
      nextRunAt: computeNextRunAt('weekdays', '08:30', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      lastRunAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const DEMO_EXECUTIONS: Record<string, RoutineExecution[]> = {
  agent_mickey_daily: [
    {
      executionId: 'exec_mickey_901',
      routineId: 'routine_unread_gmail_slack',
      routineName: 'Daily Unread Email Summary to Slack',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      status: 'completed',
      triggerType: 'scheduled',
      summary:
        'Posted top 5 unread Gmail email summary to Slack channel #new-channel (1. Cloud Run Deployment Succeeded, 2. Q4 Product Roadmap Review, 3. Stripe Payout Confirmation, 4. GitHub PR #48 Review, 5. Weekly Analytics Digest).',
      stepsLog: [
        {
          stepKey: 'load-validate-routine',
          label: '01. Load & Validate Routine Schedule',
          status: 'completed',
          detail: 'Loaded routine "Daily Unread Email Summary to Slack" (daily at 8:00 AM America/Los_Angeles).',
          durationMs: 112,
        },
        {
          stepKey: 'mark-execution-running',
          label: '02. Reserve Slot & Mark Execution Running',
          status: 'completed',
          detail: 'Reserved Inngest execution slot and computed next run window.',
          durationMs: 88,
        },
        {
          stepKey: 'verify-tool-connections',
          label: '03. Verify Active Tool & Sandbox Sessions',
          status: 'completed',
          detail: 'Verified active Composio session (sess_comp_mickey_8841) for Gmail and Slack.',
          durationMs: 194,
        },
        {
          stepKey: 'execute-agent-tool-workflow',
          label: '04. Execute Agent Workflow & Tool Calls',
          status: 'completed',
          detail: 'Fetched top 5 unread Gmail messages and posted formatted summary to Slack #new-channel.',
          durationMs: 1340,
        },
        {
          stepKey: 'finalize-execution',
          label: '05. Persist Execution Log & Append Chat Notification',
          status: 'completed',
          detail: 'Recorded completed status, updated nextRunAt, and notified user in agent chat.',
          durationMs: 102,
        },
      ],
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000 - 2000).toISOString(),
      completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      executionId: 'exec_mickey_902',
      routineId: 'routine_google_news_vm',
      routineName: 'Daily Google News AI Digest via Cloud VM',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      status: 'completed',
      triggerType: 'manual',
      summary:
        'Completed "Daily Google News AI Digest via Cloud VM": Fetched top 5 AI news headlines from Google News on E2B Cloud VM Desktop (sbx_e2b_mickey_902a) and posted digest to #new-channel.',
      stepsLog: [
        {
          stepKey: 'load-validate-routine',
          label: '01. Load & Validate Routine Schedule',
          status: 'completed',
          detail: 'Loaded routine "Daily Google News AI Digest via Cloud VM".',
          durationMs: 105,
        },
        {
          stepKey: 'mark-execution-running',
          label: '02. Reserve Slot & Mark Execution Running',
          status: 'completed',
          detail: 'Marked manual quick-run execution as running.',
          durationMs: 92,
        },
        {
          stepKey: 'verify-tool-connections',
          label: '03. Verify Active Tool & Sandbox Sessions',
          status: 'completed',
          detail: 'Verified E2B Cloud VM sandbox sbx_e2b_mickey_902a and Slack connection.',
          durationMs: 225,
        },
        {
          stepKey: 'execute-agent-tool-workflow',
          label: '04. Execute Agent Workflow & Tool Calls',
          status: 'completed',
          detail: 'Opened Chrome on Cloud VM, searched Google News for AI, and posted top 5 headlines to #new-channel.',
          durationMs: 1620,
        },
        {
          stepKey: 'finalize-execution',
          label: '05. Persist Execution Log & Append Chat Notification',
          status: 'completed',
          detail: 'Saved execution log and appended completion message to chat history.',
          durationMs: 110,
        },
      ],
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 - 2200).toISOString(),
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const DEMO_MESSAGES: Record<string, AgentChatMessage[]> = {
  agent_mickey_daily: [
    {
      messageId: 'msg_welcome_mickey',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Hello! I am **Mickey — Daily Briefer**. I am connected to **Gmail**, **Slack**, and **Google Calendar**, and my persistent **E2B Cloud VM Desktop** (`sbx_e2b_mickey_902a`) is ready.\n\nHow can I automate your workflow today?',
      responseType: 'message',
      timeLabel: '08:00 AM',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      messageId: 'msg_exec_notif_1',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Routine **Daily Unread Email Summary to Slack** completed: Summarized the top 5 unread Gmail messages and posted the digest to **#new-channel** on Slack.',
      responseType: 'message',
      timeLabel: '08:01 AM',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_code_reviewer: [
    {
      messageId: 'msg_welcome_reviewer',
      agentId: 'agent_code_reviewer',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Hello! I am **AI PR Reviewer Pro**. Provide a GitHub repository or pull request link, or schedule a recurring PR security & diff review routine.',
      responseType: 'message',
      timeLabel: '09:00 AM',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_youtube_scout: [
    {
      messageId: 'msg_welcome_scout',
      agentId: 'agent_youtube_scout',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Hello! I am **YouTube & Reddit Scout**. Ask me to monitor trending subreddits, analyze YouTube channels, or compile daily research briefs into Notion or Google Docs.',
      responseType: 'message',
      timeLabel: '09:30 AM',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export type VmStatus = 'inactive' | 'active' | 'paused';

export type RoutineFrequency = 'once' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type AgentResponseType =
  | 'message'
  | 'clarification'
  | 'tool_connection'
  | 'routine'
  | 'vm_action';

export interface ToolCatalogItem {
  slug: string;
  name: string;
  description: string;
  category: 'Communication' | 'Productivity' | 'Development' | 'Social & News';
  authType: 'OAuth2' | 'API Key';
  accentColor: string;
  sampleCapabilities: string[];
}

export interface ToolSuggestionItem {
  slug: string;
  name: string;
  description: string;
  reason: string;
  category: string;
  isConnected: boolean;
}

export interface ToolExecutionResultItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  summary: string;
  url?: string;
}

export interface ToolLiveExecutionReport {
  slug: string;
  toolName: string;
  mode: 'live_api' | 'live_feed' | 'live_webhook' | 'mcp_session';
  statusLabel: string;
  executedAt: string;
  items: ToolExecutionResultItem[];
}

export interface RoutineDraft {
  routineId?: string;
  name: string;
  goal: string;
  instructions: string;
  frequency: RoutineFrequency;
  time: string; // HH:mm (24h) or e.g. "08:00"
  timezone: string;
  days: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  tools: string[]; // slugs e.g. ['gmail', 'slack']
  targetChannel: string;
}

export interface VmActionTrace {
  url: string;
  title: string;
  query: string;
  steps: string[];
  extractedItems: {
    headline: string;
    source: string;
    timeAgo: string;
    summary: string;
    link?: string;
  }[];
}

export interface AgentStructuredResponse {
  type: AgentResponseType;
  message: string;
  question?: string;
  suggestedTools?: ToolSuggestionItem[];
  routine?: RoutineDraft;
  vmTrace?: VmActionTrace;
  editingRoutineId?: string;
}

export interface KnowledgeDocument {
  docId: string;
  agentId: string;
  name: string;
  fileType: 'pdf' | 'csv' | 'txt' | 'md';
  sizeBytes: number;
  content: string;
  summary: string;
  createdAt: string;
}

export type AgentModelId = 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview';

export type AgentTone = 'executive' | 'analytical' | 'technical' | 'commercial';

export type AgentOutputFormat = 'bullets' | 'markdown_report' | 'table' | 'concise';

export type AgentAutonomyLevel = 'copilot' | 'semi_auto' | 'full_auto';

export type VmTimeoutOption = 2 | 5 | 15 | 0; // 0 = Always active

export interface AgentEventTrigger {
  triggerId: string;
  type: 'gmail_vip' | 'github_pr' | 'slack_mention' | 'webhook_json';
  label: string;
  filterValue: string;
  isEnabled: boolean;
}

export interface AgentTemplatePreset {
  templateId: string;
  name: string;
  badge: string;
  description: string;
  systemInstructions: string;
  avatarSeed: string;
  tools: string[];
  model: AgentModelId;
  tone: AgentTone;
  outputFormat: AgentOutputFormat;
  autonomyLevel: AgentAutonomyLevel;
  defaultMemory: string[];
}

export interface AgentConfig {
  agentId: string;
  ownerId: string;
  name: string;
  description: string;
  agentImage: string;
  tools: string[]; // array of connected tool slugs
  composioSessionId: string;
  sandboxId: string;
  vmStatus: VmStatus;
  vmLastActive: string;
  isActive: boolean;
  handoffTargetAgentId?: string;
  // Studio & Advanced Options (1-8)
  model?: AgentModelId;
  temperature?: number;
  tone?: AgentTone;
  outputFormat?: AgentOutputFormat;
  responseLanguage?: 'auto' | 'fr' | 'en' | 'it';
  autonomyLevel?: AgentAutonomyLevel;
  maxDailyActions?: number;
  allowedSlackChannels?: string;
  memoryNotes?: string[];
  customVariables?: Record<string, string>;
  eventTriggers?: AgentEventTrigger[];
  vmTimeoutMinutes?: VmTimeoutOption;
  vmRegion?: 'eu-west-1' | 'us-east-1' | 'ap-northeast-1';
  vmStartupScript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRoutine {
  routineId: string;
  agentId: string;
  ownerId: string;
  name: string;
  goal: string;
  instructions: string;
  frequency: RoutineFrequency;
  time: string;
  timezone: string;
  days: string[];
  tools: string[];
  targetChannel: string;
  isActive: boolean;
  handoffTargetAgentId?: string;
  nextRunAt: string;
  lastRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineStepLog {
  stepKey: string;
  label: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  detail: string;
  durationMs: number;
}

export interface RoutineExecution {
  executionId: string;
  routineId: string;
  routineName: string;
  agentId: string;
  ownerId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  triggerType: 'manual' | 'scheduled' | 'webhook' | 'workflow';
  summary: string;
  stepsLog: RoutineStepLog[];
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface AgentChatMessage {
  messageId: string;
  agentId: string;
  ownerId: string;
  role: 'user' | 'agent';
  content: string;
  responseType: AgentResponseType;
  structured?: AgentStructuredResponse;
  timeLabel: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  credits: number;
  isDemo: boolean;
}

export interface WorkspaceAnalyticsSummary {
  totalRuns: number;
  completedRuns: number;
  successRatePercent: number;
  avgDurationMs: number;
  creditsUsed: number;
  creditsRemaining: number;
  manualRuns: number;
  scheduledRuns: number;
  webhookRuns: number;
  workflowRuns: number;
  totalKnowledgeDocs: number;
  toolBreakdown: {
    slug: string;
    count: number;
    percent: number;
  }[];
}


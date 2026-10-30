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
  triggerType: 'manual' | 'scheduled';
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

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shuffle,
  Save,
  Monitor,
  Play,
  Pause,
  Maximize2,
  Plus,
  Unplug,
  MoreVertical,
  Edit3,
  Trash2,
  Power,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Table,
  Send,
  ExternalLink,
  Zap,
  Upload,
  BookOpen,
  GitBranch,
  Webhook,
  Copy,
  Mail,
  Database,
  Cpu,
  ShieldCheck,
  Brain,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  AgentAutonomyLevel,
  AgentConfig,
  AgentEventTrigger,
  AgentModelId,
  AgentOutputFormat,
  AgentRoutine,
  AgentTone,
  ToolLiveExecutionReport,
  VmTimeoutOption,
} from '@/lib/types';
import {
  buildDiceBearAvatarUrl,
  createDefaultEventTriggers,
  evaluateToolConnectionReadiness,
  formatTimeDisplay,
  getRemainingVmSeconds,
  getToolBySlug,
  isGoogleWorkspaceTool,
  TOOL_CATALOG,
} from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import {
  LiveCalendarEvent,
  LiveGitHubItem,
  LiveGmailMessage,
} from '@/lib/workspace-server';

export type ConfigTab = 'settings' | 'tools' | 'schedule' | 'history';

export function ConfigPanel({
  agent,
  activeTab,
  setActiveTab,
}: {
  agent: AgentConfig;
  activeTab: ConfigTab;
  setActiveTab: (tab: ConfigTab) => void;
}) {
  const router = useRouter();
  const {
    agents,
    routinesByAgent,
    executionsByAgent,
    knowledgeByAgent,
    updateAgentConfig,
    deleteAgent,
    connectAllToolsToAgent,
    disconnectToolFromAgent,
    openMarketplace,
    setVmStatusForAgent,
    openVmModal,
    appendChatMessage,
    addKnowledgeDocument,
    deleteKnowledgeDocument,
    toggleRoutineActive,
    deleteRoutine,
    startEditingRoutine,
    runRoutineNow,
    runHourlyCronCheck,
    runMultiAgentWorkflow,
    triggerIncomingWebhook,
    workspaceToken,
    connectGoogleWorkspaceOAuth,
    slackWebhookUrl,
    setSlackWebhookUrl,
    githubRepo,
    setGithubRepo,
    githubToken,
    setGithubToken,
    notionToken,
    setNotionToken,
    notionParentId,
    setNotionParentId,
    toolCredentials,
    autoSchedulerEnabled,
    setAutoSchedulerEnabled,
    lastSchedulerTick,
    scheduleRoutineInSeconds,
    locale,
    t,
    addToast,
  } = useOrbit();

  const [nameInput, setNameInput] = useState(agent.name);
  const [descInput, setDescInput] = useState(agent.description);
  const [avatarUrl, setAvatarUrl] = useState(agent.agentImage);
  const [handoffAgentInput, setHandoffAgentInput] = useState(
    agent.handoffTargetAgentId || ''
  );

  // Studio & Advanced Options State (1-8)
  const [modelInput, setModelInput] = useState<AgentModelId>(
    agent.model || 'gemini-3-flash-preview'
  );
  const [temperatureInput, setTemperatureInput] = useState<number>(
    agent.temperature ?? 0.2
  );
  const [toneInput, setToneInput] = useState<AgentTone>(agent.tone || 'executive');
  const [outputFormatInput, setOutputFormatInput] = useState<AgentOutputFormat>(
    agent.outputFormat || 'bullets'
  );
  const [responseLangInput, setResponseLangInput] = useState<'auto' | 'fr' | 'en' | 'it'>(
    agent.responseLanguage || 'auto'
  );
  const [autonomyInput, setAutonomyInput] = useState<AgentAutonomyLevel>(
    agent.autonomyLevel || 'copilot'
  );
  const [maxDailyActionsInput, setMaxDailyActionsInput] = useState<number>(
    agent.maxDailyActions ?? 25
  );
  const [allowedChannelsInput, setAllowedChannelsInput] = useState<string>(
    agent.allowedSlackChannels || '#new-channel, #general'
  );
  const [memoryList, setMemoryList] = useState<string[]>(agent.memoryNotes || []);
  const [newMemoryItem, setNewMemoryItem] = useState<string>('');
  const [customVars, setCustomVars] = useState<Record<string, string>>(
    agent.customVariables || {}
  );
  const [newVarKey, setNewVarKey] = useState<string>('');
  const [newVarVal, setNewVarVal] = useState<string>('');
  const [eventTriggersList, setEventTriggersList] = useState<AgentEventTrigger[]>(
    agent.eventTriggers && agent.eventTriggers.length > 0
      ? agent.eventTriggers
      : createDefaultEventTriggers()
  );
  const [vmTimeoutInput, setVmTimeoutInput] = useState<VmTimeoutOption>(
    agent.vmTimeoutMinutes ?? 5
  );
  const [vmRegionInput, setVmRegionInput] = useState<'eu-west-1' | 'us-east-1' | 'ap-northeast-1'>(
    agent.vmRegion || 'eu-west-1'
  );
  const [vmStartupScriptInput, setVmStartupScriptInput] = useState<string>(
    agent.vmStartupScript || ''
  );

  const [savingConfig, setSavingConfig] = useState(false);

  const [openMenuRoutineId, setOpenMenuRoutineId] = useState<string | null>(null);
  const [confirmRunRoutine, setConfirmRunRoutine] = useState<AgentRoutine | null>(null);
  const [runningRoutineId, setRunningRoutineId] = useState<string | null>(null);
  const [confirmToggleRoutine, setConfirmToggleRoutine] = useState<AgentRoutine | null>(null);
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState<AgentRoutine | null>(null);
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  // RAG Knowledge Base state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [manualDocTitle, setManualDocTitle] = useState('');
  const [manualDocContent, setManualDocContent] = useState('');
  const [showManualDocForm, setShowManualDocForm] = useState(false);

  // Multi-Agent Workflow state
  const [workflowTopic, setWorkflowTopic] = useState('');
  const [runningWorkflow, setRunningWorkflow] = useState(false);

  // Incoming Webhook state
  const [triggeringWebhook, setTriggeringWebhook] = useState<string | null>(null);

  // Live Google Workspace, Gmail Send/Draft, GitHub, Notion & Slack state
  const [syncingWorkspace, setSyncingWorkspace] = useState(false);
  const [liveGmailList, setLiveGmailList] = useState<LiveGmailMessage[]>([]);
  const [liveCalendarList, setLiveCalendarList] = useState<LiveCalendarEvent[]>([]);
  const [createdWorkspaceUrl, setCreatedWorkspaceUrl] = useState<{
    label: string;
    url: string;
  } | null>(null);
  const [pendingWorkspaceMutation, setPendingWorkspaceMutation] = useState<
    | 'create_doc'
    | 'create_sheet'
    | 'post_slack'
    | 'send_gmail'
    | 'create_gmail_draft'
    | 'create_notion_page'
    | null
  >(null);
  const [executingMutation, setExecutingMutation] = useState(false);
  const [slackWebhookInput, setSlackWebhookInput] = useState(slackWebhookUrl);

  // Gmail Compose / Send inputs
  const [gmailTo, setGmailTo] = useState('');
  const [gmailSubject, setGmailSubject] = useState(
    `[Orbit · ${agent.name}] Synthèse exécutive`
  );
  const [gmailBody, setGmailBody] = useState(
    'Bonjour,\n\nVoici la dernière synthèse générée par votre agent Orbit.\n\nCordialement,\nOrbit AI'
  );

  // GitHub Live API state
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [githubReport, setGithubReport] = useState<{
    repo: string;
    pulls: LiveGitHubItem[];
    issues: LiveGitHubItem[];
  } | null>(null);

  // Universal 12-Tool Live Executor State
  const [executingToolSlug, setExecutingToolSlug] = useState<string | null>(null);
  const [toolLiveReports, setToolLiveReports] = useState<
    Record<string, ToolLiveExecutionReport>
  >({});
  const [toolCustomParams, setToolCustomParams] = useState<Record<string, string>>({
    reddit: 'r/artificial',
    youtube: 'AI Agents & Cloud VM',
    linear: 'Cycle Sprint #24',
    clickup: 'Liste Sprint Q4',
    discord: '',
    outlook: 'Boîte Prioritaire Direction',
  });
  const [linearTokenInput, setLinearTokenInput] = useState<string>('');

  useEffect(() => {
    setNameInput(agent.name);
    setDescInput(agent.description);
    setAvatarUrl(agent.agentImage);
    setHandoffAgentInput(agent.handoffTargetAgentId || '');
    setModelInput(agent.model || 'gemini-3-flash-preview');
    setTemperatureInput(agent.temperature ?? 0.2);
    setToneInput(agent.tone || 'executive');
    setOutputFormatInput(agent.outputFormat || 'bullets');
    setResponseLangInput(agent.responseLanguage || 'auto');
    setAutonomyInput(agent.autonomyLevel || 'copilot');
    setMaxDailyActionsInput(agent.maxDailyActions ?? 25);
    setAllowedChannelsInput(agent.allowedSlackChannels || '#new-channel, #general');
    setMemoryList(agent.memoryNotes || []);
    setCustomVars(agent.customVariables || {});
    setEventTriggersList(
      agent.eventTriggers && agent.eventTriggers.length > 0
        ? agent.eventTriggers
        : createDefaultEventTriggers()
    );
    setVmTimeoutInput(agent.vmTimeoutMinutes ?? 5);
    setVmRegionInput(agent.vmRegion || 'eu-west-1');
    setVmStartupScriptInput(agent.vmStartupScript || '');
    setGmailSubject(`[Orbit · ${agent.name}] Synthèse exécutive`);
  }, [
    agent.agentId,
    agent.name,
    agent.description,
    agent.agentImage,
    agent.handoffTargetAgentId,
    agent.model,
    agent.temperature,
    agent.tone,
    agent.outputFormat,
    agent.responseLanguage,
    agent.autonomyLevel,
    agent.maxDailyActions,
    agent.allowedSlackChannels,
    agent.memoryNotes,
    agent.customVariables,
    agent.eventTriggers,
    agent.vmTimeoutMinutes,
    agent.vmRegion,
    agent.vmStartupScript,
  ]);

  useEffect(() => {
    setSlackWebhookInput(slackWebhookUrl);
  }, [slackWebhookUrl]);

  useEffect(() => {
    setMounted(true);
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const routines = routinesByAgent[agent.agentId] || [];
  const executions = executionsByAgent[agent.agentId] || [];
  const knowledgeDocs = knowledgeByAgent[agent.agentId] || [];
  const otherAgents = agents.filter((a) => a.agentId !== agent.agentId);
  const remainingVmSeconds = mounted
    ? getRemainingVmSeconds(agent.vmStatus, agent.vmLastActive, nowMs, vmTimeoutInput)
    : 120;

  const hasGoogleTool = agent.tools.some((slug) => isGoogleWorkspaceTool(slug));
  const hasSlackTool = agent.tools.includes('slack');
  const hasGithubTool = agent.tools.includes('github');
  const hasNotionTool = agent.tools.includes('notion');

  const handleShuffleAvatar = () => {
    const randomSeed =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setAvatarUrl(buildDiceBearAvatarUrl(randomSeed));
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    await updateAgentConfig(agent.agentId, {
      name: nameInput,
      description: descInput,
      agentImage: avatarUrl,
      handoffTargetAgentId: handoffAgentInput,
      model: modelInput,
      temperature: temperatureInput,
      tone: toneInput,
      outputFormat: outputFormatInput,
      responseLanguage: responseLangInput,
      autonomyLevel: autonomyInput,
      maxDailyActions: maxDailyActionsInput,
      allowedSlackChannels: allowedChannelsInput,
      memoryNotes: memoryList,
      customVariables: customVars,
      eventTriggers: eventTriggersList,
      vmTimeoutMinutes: vmTimeoutInput,
      vmRegion: vmRegionInput,
      vmStartupScript: vmStartupScriptInput,
    });
    setSavingConfig(false);
  };

  const handleAddMemoryNote = () => {
    const clean = newMemoryItem.trim();
    if (!clean) return;
    const next = [...memoryList, clean];
    setMemoryList(next);
    setNewMemoryItem('');
    updateAgentConfig(agent.agentId, { memoryNotes: next });
  };

  const handleRemoveMemoryNote = (idx: number) => {
    const next = memoryList.filter((_, i) => i !== idx);
    setMemoryList(next);
    updateAgentConfig(agent.agentId, { memoryNotes: next });
  };

  const handleAddCustomVar = () => {
    const k = newVarKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const v = newVarVal.trim();
    if (!k || !v) return;
    const next = { ...customVars, [k]: v };
    setCustomVars(next);
    setNewVarKey('');
    setNewVarVal('');
    updateAgentConfig(agent.agentId, { customVariables: next });
  };

  const handleRemoveCustomVar = (key: string) => {
    const next = { ...customVars };
    delete next[key];
    setCustomVars(next);
    updateAgentConfig(agent.agentId, { customVariables: next });
  };

  const handleToggleEventTrigger = (triggerId: string) => {
    const next = eventTriggersList.map((tr) =>
      tr.triggerId === triggerId ? { ...tr, isEnabled: !tr.isEnabled } : tr
    );
    setEventTriggersList(next);
    updateAgentConfig(agent.agentId, { eventTriggers: next });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const lower = file.name.toLowerCase();
      let rawText = '';
      let base64Data = '';

      if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      } else {
        rawText = await file.text();
      }

      const detectedType: 'pdf' | 'csv' | 'txt' | 'md' = lower.endsWith('.pdf')
        ? 'pdf'
        : lower.endsWith('.csv')
          ? 'csv'
          : lower.endsWith('.md')
            ? 'md'
            : 'txt';

      const res = await fetch('/api/knowledge/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.agentId,
          name: file.name,
          fileType: detectedType,
          sizeBytes: file.size,
          rawText,
          base64Data,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.document) {
        throw new Error(data.error || 'Extraction error');
      }

      addKnowledgeDocument(agent.agentId, data.document);
    } catch (err) {
      console.error('RAG upload failed:', err);
      addToast({
        title: 'Erreur lors de l’indexation du document',
        description: err instanceof Error ? err.message : 'Format non supporté',
        type: 'error',
      });
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleAddManualDocument = async () => {
    if (!manualDocTitle.trim() || !manualDocContent.trim()) return;
    setUploadingDoc(true);
    const title = manualDocTitle.trim().endsWith('.txt')
      ? manualDocTitle.trim()
      : `${manualDocTitle.trim()}.txt`;
    addKnowledgeDocument(agent.agentId, {
      docId: `doc_manual_${Date.now()}`,
      agentId: agent.agentId,
      name: title,
      fileType: 'txt',
      sizeBytes: manualDocContent.length,
      content: manualDocContent.trim(),
      summary: manualDocContent.trim().slice(0, 180),
      createdAt: new Date().toISOString(),
    });
    setManualDocTitle('');
    setManualDocContent('');
    setShowManualDocForm(false);
    setUploadingDoc(false);
  };

  const handleRunWorkflowChain = async () => {
    const targetId = handoffAgentInput || otherAgents[0]?.agentId;
    if (!targetId) return;
    setRunningWorkflow(true);
    if (handoffAgentInput !== targetId) {
      setHandoffAgentInput(targetId);
      await updateAgentConfig(agent.agentId, { handoffTargetAgentId: targetId });
    }
    await runMultiAgentWorkflow(
      agent.agentId,
      targetId,
      workflowTopic.trim() || undefined
    );
    setRunningWorkflow(false);
  };

  const handleSimulateWebhook = async (
    eventType: string,
    payload: Record<string, unknown>
  ) => {
    setTriggeringWebhook(eventType);
    await triggerIncomingWebhook(agent.agentId, eventType, payload);
    setTriggeringWebhook(null);
  };

  const handleFetchGithubLive = async () => {
    if (!githubRepo.trim()) return;
    setLoadingGithub(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch_github',
          githubRepo: githubRepo.trim(),
          githubToken: githubToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'GitHub API error');
      }
      setGithubReport(data);
      addToast({
        title: `GitHub synchronisé (${data.repo})`,
        description: `${(data.pulls || []).length} PRs · ${(data.issues || []).length} Issues`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Erreur GitHub API',
        description: err instanceof Error ? err.message : 'Vérifiez owner/repo',
        type: 'error',
      });
    } finally {
      setLoadingGithub(false);
    }
  };

  const handleExecuteLiveTool = async (slug: string, postToChat = false) => {
    setExecutingToolSlug(slug);
    try {
      const savedCred = toolCredentials[slug] || {};
      const targetParam =
        slug === 'github'
          ? githubRepo || savedCred.targetParam
          : toolCustomParams[slug] || savedCred.targetParam || '';
      const apiToken =
        savedCred.apiToken ||
        (slug === 'github'
          ? githubToken
          : slug === 'linear'
            ? linearTokenInput
            : slug === 'notion'
              ? notionToken
              : undefined);
      const webhookUrl =
        savedCred.webhookUrl ||
        (slug === 'discord'
          ? toolCustomParams.discord
          : slug === 'slack'
            ? slackWebhookInput
            : undefined);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (workspaceToken) {
        headers.Authorization = `Bearer ${workspaceToken}`;
      }

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'execute_tool',
          toolSlug: slug,
          agentName: agent.name,
          composioSessionId: agent.composioSessionId,
          locale,
          targetParam,
          apiToken,
          webhookUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        throw new Error(data.error || 'Tool execution error');
      }

      setToolLiveReports((prev) => ({
        ...prev,
        [slug]: data.report,
      }));

      if (postToChat && data.message) {
        await appendChatMessage(agent.agentId, {
          messageId: `msg_tool_${slug}_${Date.now()}`,
          agentId: agent.agentId,
          ownerId: agent.ownerId,
          role: 'agent',
          content: data.message,
          responseType: 'message',
          timeLabel: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          createdAt: new Date().toISOString(),
        });
      }

      addToast({
        title: `${data.report.toolName} synchronisé`,
        description: data.report.statusLabel,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: `Erreur d'exécution (${slug})`,
        description: err instanceof Error ? err.message : 'Veuillez réessayer',
        type: 'error',
      });
    } finally {
      setExecutingToolSlug(null);
    }
  };

  const handleConfirmRunNow = async () => {
    if (!confirmRunRoutine) return;
    const target = confirmRunRoutine;
    setConfirmRunRoutine(null);
    setRunningRoutineId(target.routineId);
    await new Promise((r) => setTimeout(r, 350));
    await runRoutineNow(agent.agentId, target.routineId, 'manual');
    setRunningRoutineId(null);
  };

  const handleDeleteAgentConfirm = async () => {
    const targetId = agent.agentId;
    await deleteAgent(targetId);
    router.push('/workspace');
  };

  const handleSyncLiveWorkspace = async () => {
    let token = workspaceToken;
    if (!token) {
      token = await connectGoogleWorkspaceOAuth();
    }
    if (!token) return;

    setSyncingWorkspace(true);
    try {
      const res = await fetch('/api/workspace', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setLiveGmailList(data.gmailMessages || []);
      setLiveCalendarList(data.calendarEvents || []);
      addToast({
        title: 'Google Workspace Synchronisé',
        description: `${(data.gmailMessages || []).length} e-mails Gmail · ${(data.calendarEvents || []).length} événements Agenda`,
        type: 'success',
      });
    } catch (err) {
      console.error('Workspace sync error:', err);
      addToast({
        title: 'Erreur de synchronisation Google Workspace',
        description:
          locale === 'fr'
            ? 'Veuillez réautoriser votre session Google OAuth.'
            : 'Please re-authorize your Google OAuth session.',
        type: 'error',
      });
    } finally {
      setSyncingWorkspace(false);
    }
  };

  const handleConfirmWorkspaceMutation = async () => {
    if (!pendingWorkspaceMutation) return;
    const action = pendingWorkspaceMutation;
    setExecutingMutation(true);

    try {
      const latestSummary =
        executions[0]?.summary ||
        agent.description ||
        'Rapport généré par Orbit AI Agent.';

      if (action === 'post_slack') {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'post_slack',
            slackWebhookUrl: slackWebhookInput,
            slackText: `*[Orbit Agent: ${agent.name}]* Test de connexion en direct réussi (${new Date().toLocaleTimeString()}).`,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.delivered) {
          throw new Error(data.error || 'Slack Webhook error');
        }
        addToast({
          title: 'Message Slack envoyé',
          description: 'Votre canal Slack a reçu la notification en direct.',
          type: 'success',
        });
        setPendingWorkspaceMutation(null);
        return;
      }

      if (action === 'create_notion_page') {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_notion_page',
            notionToken: notionToken.trim(),
            notionParentId: notionParentId.trim(),
            title: `${agent.name} — ${new Date().toLocaleDateString()}`,
            content: latestSummary,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Notion API error');
        }
        setCreatedWorkspaceUrl({
          label: 'Page Notion créée',
          url: data.url,
        });
        addToast({
          title: 'Page Notion créée avec succès',
          description: `${agent.name} — ${new Date().toLocaleDateString()}`,
          type: 'success',
        });
        setPendingWorkspaceMutation(null);
        return;
      }

      let token = workspaceToken;
      if (!token) {
        token = await connectGoogleWorkspaceOAuth();
      }
      if (!token) {
        setPendingWorkspaceMutation(null);
        return;
      }

      if (action === 'send_gmail' || action === 'create_gmail_draft') {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            emailTo: gmailTo.trim(),
            emailSubject: gmailSubject.trim(),
            emailBody: gmailBody.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gmail API operation failed');
        }
        addToast({
          title:
            action === 'send_gmail'
              ? 'E-mail envoyé via Gmail API'
              : 'Brouillon créé dans Gmail',
          description: `Destinataire : ${gmailTo.trim()}`,
          type: 'success',
        });
        setPendingWorkspaceMutation(null);
        return;
      }

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          title: `${agent.name} — ${new Date().toLocaleDateString()}`,
          content: latestSummary,
          rows: [
            ['Date', 'Agent', 'Résumé Exécutif'],
            [new Date().toISOString(), agent.name, latestSummary],
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Workspace write failed');
      }

      setCreatedWorkspaceUrl({
        label: action === 'create_doc' ? 'Google Doc créé' : 'Google Sheet créé',
        url: data.url,
      });
      addToast({
        title: action === 'create_doc' ? 'Google Doc créé' : 'Google Sheet créé',
        description: data.title,
        type: 'success',
      });
    } catch (err) {
      console.error('Workspace mutation failed:', err);
      addToast({
        title: 'Échec de l’opération',
        description: err instanceof Error ? err.message : 'Erreur API',
        type: 'error',
      });
    } finally {
      setExecutingMutation(false);
      setPendingWorkspaceMutation(null);
    }
  };

  const webhookEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/agent/${agent.agentId}`
      : `/api/webhooks/agent/${agent.agentId}`;

  return (
    <aside className="w-[410px] shrink-0 border-l border-slate-200 bg-slate-50/60 flex flex-col h-screen overflow-hidden">
      {/* Top Agent Identity & Save Header */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900">
            {t.config.headerTitle}
          </span>
          <button
            type="button"
            disabled={savingConfig}
            onClick={handleSaveConfig}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingConfig ? t.config.savingBtn : t.config.saveBtn}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <Image
              src={avatarUrl}
              alt={nameInput}
              fill
              sizes="48px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              aria-label="Agent Name"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
            />
            <button
              type="button"
              onClick={handleShuffleAvatar}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Shuffle className="h-3 w-3" />
              <span>{t.config.shuffleAvatar}</span>
            </button>
          </div>
        </div>

        {/* 4 Segmented Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'settings', label: t.config.tabSettings },
              { id: 'tools', label: `${t.config.tabTools} (${agent.tools.length})` },
              { id: 'schedule', label: `${t.config.tabSchedule} (${routines.length})` },
              { id: 'history', label: `${t.config.tabHistory} (${executions.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SETTINGS */}
        {activeTab === 'settings' && (
          <>
            {/* E2B Cloud VM Desktop Sandbox Widget */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-800" />
                  <span className="text-xs font-bold text-slate-900">
                    {t.config.vmTitle}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono tabular-nums font-medium ${
                    agent.vmStatus === 'active'
                      ? 'text-emerald-700'
                      : agent.vmStatus === 'paused'
                        ? 'text-amber-700'
                        : 'text-slate-500'
                  }`}
                >
                  {agent.vmStatus === 'active'
                    ? mounted
                      ? `${t.config.vmActive} (${Math.floor(remainingVmSeconds / 60)}:${String(
                          remainingVmSeconds % 60
                        ).padStart(2, '0')})`
                      : t.config.vmActive
                    : agent.vmStatus === 'paused'
                      ? t.config.vmPaused
                      : t.config.vmInactive}
                </span>
              </div>

              {agent.vmStatus === 'active' ? (
                <div
                  onClick={() => openVmModal(agent.agentId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openVmModal(agent.agentId);
                  }}
                  aria-label={t.config.vmOpenFullBtn}
                  className="group relative h-36 rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-200 flex flex-col justify-between cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{agent.sandboxId} · Chrome :0</span>
                    <span className="text-emerald-400">{t.config.vmLiveStream}</span>
                  </div>
                  <div className="my-auto space-y-1 font-mono text-[11px]">
                    <p className="text-white font-semibold truncate">
                      https://news.google.com/search?q=AI
                    </p>
                    <p className="text-slate-400 text-[10px] line-clamp-2">
                      {t.config.vmSessionNote}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                    <span>{t.config.vmClickFull}</span>
                    <Maximize2 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              ) : (
                <div className="h-36 rounded-lg border border-slate-200 bg-slate-900 p-4 text-center flex flex-col items-center justify-center">
                  <p className="text-xs font-semibold text-white">
                    VM Sandbox ({agent.vmStatus === 'paused' ? t.config.vmPaused : t.config.vmInactive})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {agent.sandboxId} · {t.config.vmAutoPauseNote}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVmStatusForAgent(agent.agentId, 'active')}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>
                      {agent.vmStatus === 'paused'
                        ? t.config.vmReactivate
                        : t.config.vmStart}
                    </span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (agent.vmStatus !== 'active') {
                      await setVmStatusForAgent(agent.agentId, 'active');
                    }
                    openVmModal(agent.agentId);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>{t.config.vmOpenFullBtn}</span>
                </button>
                {agent.vmStatus === 'active' && (
                  <button
                    type="button"
                    onClick={() => setVmStatusForAgent(agent.agentId, 'paused')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>{t.config.vmPauseBtn}</span>
                  </button>
                )}
              </div>

              {/* 7. Advanced Cloud VM Options (Timeout, Region, Startup Script) */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="vm-timeout-select"
                      className="block text-[10px] font-semibold text-slate-600 mb-1"
                    >
                      Mise en veille auto VM
                    </label>
                    <select
                      id="vm-timeout-select"
                      value={vmTimeoutInput}
                      onChange={(e) => {
                        const val = Number(e.target.value) as VmTimeoutOption;
                        setVmTimeoutInput(val);
                        updateAgentConfig(agent.agentId, { vmTimeoutMinutes: val });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-900"
                    >
                      <option value={2}>2 minutes</option>
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={0}>Toujours actif (24/7)</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="vm-region-select"
                      className="block text-[10px] font-semibold text-slate-600 mb-1"
                    >
                      Région Cloud VM
                    </label>
                    <select
                      id="vm-region-select"
                      value={vmRegionInput}
                      onChange={(e) => {
                        const val = e.target.value as 'eu-west-1' | 'us-east-1' | 'ap-northeast-1';
                        setVmRegionInput(val);
                        updateAgentConfig(agent.agentId, { vmRegion: val });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-900"
                    >
                      <option value="eu-west-1">Europe (Paris / Francfort)</option>
                      <option value="us-east-1">US East (Virginia)</option>
                      <option value="ap-northeast-1">Asie (Tokyo)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="vm-startup-script"
                    className="block text-[10px] font-semibold text-slate-600 mb-1"
                  >
                    Script de démarrage Sandbox (Bash / Chrome)
                  </label>
                  <input
                    id="vm-startup-script"
                    type="text"
                    value={vmStartupScriptInput}
                    onChange={(e) => setVmStartupScriptInput(e.target.value)}
                    placeholder="ex. google-chrome https://news.google.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 1. Personnalité, Rôle, Ton & Instructions Système */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-800" />
                <div>
                  <label
                    htmlFor="agent-instructions-textarea"
                    className="block text-xs font-bold text-slate-900"
                  >
                    1. Personnalité, Ton & Instructions Système
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {t.config.instructionsSub} ({agent.name})
                  </p>
                </div>
              </div>

              <textarea
                id="agent-instructions-textarea"
                rows={3}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 leading-relaxed"
              />

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label
                    htmlFor="agent-tone-select"
                    className="block text-[10px] font-semibold text-slate-600 mb-1"
                  >
                    Ton de réponse
                  </label>
                  <select
                    id="agent-tone-select"
                    value={toneInput}
                    onChange={(e) => {
                      const val = e.target.value as AgentTone;
                      setToneInput(val);
                      updateAgentConfig(agent.agentId, { tone: val });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-900"
                  >
                    <option value="executive">Exécutif / Concis</option>
                    <option value="analytical">Analytique / Détaillé</option>
                    <option value="technical">Technique / Dev</option>
                    <option value="commercial">Commercial / Client</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="agent-format-select"
                    className="block text-[10px] font-semibold text-slate-600 mb-1"
                  >
                    Format préféré
                  </label>
                  <select
                    id="agent-format-select"
                    value={outputFormatInput}
                    onChange={(e) => {
                      const val = e.target.value as AgentOutputFormat;
                      setOutputFormatInput(val);
                      updateAgentConfig(agent.agentId, { outputFormat: val });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-900"
                  >
                    <option value="bullets">Bullet points</option>
                    <option value="markdown_report">Rapport structuré</option>
                    <option value="table">Tableau Markdown</option>
                    <option value="concise">Synthèse courte</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="agent-lang-select"
                    className="block text-[10px] font-semibold text-slate-600 mb-1"
                  >
                    Langue forcée
                  </label>
                  <select
                    id="agent-lang-select"
                    value={responseLangInput}
                    onChange={(e) => {
                      const val = e.target.value as 'auto' | 'fr' | 'en' | 'it';
                      setResponseLangInput(val);
                      updateAgentConfig(agent.agentId, { responseLanguage: val });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-900"
                  >
                    <option value="auto">Auto (Interface)</option>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="it">Italiano</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Choix du Modèle IA & Paramètres Cognitifs */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-slate-800" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      2. Modèle IA & Paramètres Cognitifs
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Sélectionnez le moteur Gemini et la température
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModelInput('gemini-3-flash-preview');
                    updateAgentConfig(agent.agentId, { model: 'gemini-3-flash-preview' });
                  }}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    modelInput === 'gemini-3-flash-preview'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-bold">Gemini 3 Flash</p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      modelInput === 'gemini-3-flash-preview'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    Faible latence · Routines & tri
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModelInput('gemini-3.1-pro-preview');
                    updateAgentConfig(agent.agentId, { model: 'gemini-3.1-pro-preview' });
                  }}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    modelInput === 'gemini-3.1-pro-preview'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-bold">Gemini 3.1 Pro</p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      modelInput === 'gemini-3.1-pro-preview'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    Raisonnement profond · Code & RAG
                  </p>
                </button>
              </div>

              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="agent-temp-slider" className="font-semibold text-slate-700">
                    Température (Précision vs Créativité)
                  </label>
                  <span className="font-mono font-bold text-slate-900">
                    {temperatureInput.toFixed(1)}
                  </span>
                </div>
                <input
                  id="agent-temp-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperatureInput}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTemperatureInput(val);
                  }}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.0 (Strictement factuel)</span>
                  <span>1.0 (Créatif / Rédactionnel)</span>
                </div>
              </div>
            </div>

            {/* 3. Niveau d'Autonomie & Garde-fous (Human-in-the-Loop) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-800" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    3. Niveau d’Autonomie & Garde-fous
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Contrôle humain (Human-in-the-Loop) et limites de sécurité
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'copilot', label: 'Copilote', desc: 'Approbation 1-clic' },
                    { id: 'semi_auto', label: 'Semi-Auto', desc: 'Lecture directe' },
                    { id: 'full_auto', label: '100% Auto', desc: 'Sans confirmation' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setAutonomyInput(mode.id);
                      updateAgentConfig(agent.agentId, { autonomyLevel: mode.id });
                    }}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      autonomyInput === mode.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-[11px] font-bold truncate">{mode.label}</p>
                    <p
                      className={`text-[10px] truncate ${
                        autonomyInput === mode.id ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {mode.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label
                    htmlFor="max-daily-actions"
                    className="block text-[10px] font-semibold text-slate-600 mb-1"
                  >
                    Max actions / jour
                  </label>
                  <input
                    id="max-daily-actions"
                    type="number"
                    min={1}
                    max={500}
                    value={maxDailyActionsInput}
                    onChange={(e) =>
                      setMaxDailyActionsInput(Math.max(1, parseInt(e.target.value, 10) || 25))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="allowed-slack-channels"
                    className="block text-[10px] font-semibold text-slate-600 mb-1"
                  >
                    Canaux Slack autorisés
                  </label>
                  <input
                    id="allowed-slack-channels"
                    type="text"
                    value={allowedChannelsInput}
                    onChange={(e) => setAllowedChannelsInput(e.target.value)}
                    placeholder="#new-channel, #general"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 5. Mémoire à Long Terme & Variables de Contexte */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-slate-800" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    5. Mémoire à Long Terme & Variables ({memoryList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Préférences persistantes et constantes injectées dans chaque session
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newMemoryItem}
                  onChange={(e) => setNewMemoryItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemoryNote();
                    }
                  }}
                  placeholder="Ajouter un fait (ex. Signature : Cordialement, Abdoulaye)"
                  aria-label="Nouvelle note mémoire"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddMemoryNote}
                  className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shrink-0"
                >
                  + Mémoriser
                </button>
              </div>

              {memoryList.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {memoryList.map((note, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-800"
                    >
                      <span className="truncate">• {note}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMemoryNote(idx)}
                        aria-label={`Supprimer mémoire ${idx + 1}`}
                        className="text-slate-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Variables */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Variables de contexte (Clé = Valeur)
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newVarKey}
                    onChange={(e) => setNewVarKey(e.target.value)}
                    placeholder="CLÉ (ex. REPO)"
                    aria-label="Nom de variable"
                    className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-900"
                  />
                  <input
                    type="text"
                    value={newVarVal}
                    onChange={(e) => setNewVarVal(e.target.value)}
                    placeholder="Valeur (ex. org/app)"
                    aria-label="Valeur de variable"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomVar}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 shrink-0"
                  >
                    + Var
                  </button>
                </div>

                {Object.entries(customVars).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(customVars).map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-800"
                      >
                        <strong>{k}</strong>={v}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomVar(k)}
                          aria-label={`Supprimer variable ${k}`}
                          className="text-slate-400 hover:text-red-600 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 6. Déclencheurs Événementiels Temps Réel (Event Triggers) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-slate-800" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    6. Déclencheurs Événementiels Temps Réel
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Réveille automatiquement {agent.name} sur événement externe
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {eventTriggersList.map((trg) => (
                  <div
                    key={trg.triggerId}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {trg.label}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">
                        Filtre : {trg.filterValue}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleEventTrigger(trg.triggerId)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors shrink-0 ${
                        trg.isEnabled
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {trg.isEnabled ? 'Actif' : 'Inactif'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 1. RAG Document Knowledge Base (PDF, CSV, TXT, MD) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-800" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Base de Connaissances RAG ({knowledgeDocs.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      PDF, CSV, TXT, MD · Contexte injecté dans Gemini
                    </p>
                  </div>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors shrink-0">
                  {uploadingDoc ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  <span>Importer</span>
                  <input
                    type="file"
                    accept=".pdf,.csv,.txt,.md,application/pdf,text/csv,text/plain"
                    onChange={handleFileUpload}
                    disabled={uploadingDoc}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowManualDocForm(!showManualDocForm)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 text-center"
                >
                  {showManualDocForm
                    ? 'Fermer l’éditeur'
                    : '+ Ajouter une procédure / note interne'}
                </button>
              </div>

              {showManualDocForm && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                  <input
                    type="text"
                    value={manualDocTitle}
                    onChange={(e) => setManualDocTitle(e.target.value)}
                    placeholder="Titre (ex. Politique_Remboursement_2026.txt)"
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                  <textarea
                    rows={3}
                    value={manualDocContent}
                    onChange={(e) => setManualDocContent(e.target.value)}
                    placeholder="Collez vos règles métier, SLA, tarifs, FAQ ou extraits CSV..."
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    disabled={uploadingDoc}
                    onClick={handleAddManualDocument}
                    className="w-full rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Indexer dans la base RAG de {agent.name}
                  </button>
                </div>
              )}

              {knowledgeDocs.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Aucun document indexé. Importez un PDF, CSV ou TXT pour ancrer les réponses de cet agent.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                  {knowledgeDocs.map((docItem) => (
                    <div
                      key={docItem.docId}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {docItem.fileType}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {docItem.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            deleteKnowledgeDocument(agent.agentId, docItem.docId)
                          }
                          aria-label={`Supprimer ${docItem.name}`}
                          className="text-slate-400 hover:text-red-600 p-0.5 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                        {docItem.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Multi-Agent Collaboration (Workflows en chaîne : Agent A -> Agent B) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-slate-800" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Collaboration Multi-Agents (Agent A → Agent B)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Transmet automatiquement les trouvailles de {agent.name} à un second agent
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Agent B destinataire (Relais automatique)
                </label>
                <select
                  value={handoffAgentInput}
                  onChange={(e) => {
                    setHandoffAgentInput(e.target.value);
                    updateAgentConfig(agent.agentId, {
                      handoffTargetAgentId: e.target.value,
                    });
                  }}
                  aria-label="Agent B destinataire"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900"
                >
                  <option value="">— Aucun relais automatique —</option>
                  {otherAgents.map((other) => (
                    <option key={other.agentId} value={other.agentId}>
                      {other.name} ({other.tools.join(', ')})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={workflowTopic}
                  onChange={(e) => setWorkflowTopic(e.target.value)}
                  placeholder="Sujet du pipeline (ex. Analyse concurrentielle Q4 + Mémo Slack)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                />

                <button
                  type="button"
                  disabled={runningWorkflow || otherAgents.length === 0}
                  onClick={handleRunWorkflowChain}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {runningWorkflow ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Exécution Pipeline A → B en cours...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>
                        Lancer le Pipeline ({agent.name} →{' '}
                        {otherAgents.find((a) => a.agentId === handoffAgentInput)
                          ?.name ||
                          otherAgents[0]?.name ||
                          'Agent B'}
                        )
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 6. Incoming Webhooks (External Event Triggers) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-slate-800" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Webhook Entrant (API Externe)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Déclenchez {agent.name} depuis Stripe, GitHub ou Zapier
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookEndpointUrl);
                    addToast({
                      title: 'URL Webhook copiée',
                      description: webhookEndpointUrl,
                      type: 'info',
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copier URL</span>
                </button>
              </div>

              <div className="rounded-lg bg-slate-950 p-2 font-mono text-[10px] text-emerald-400 break-all">
                POST {webhookEndpointUrl}
              </div>

              <p className="text-[11px] font-semibold text-slate-700">
                Tester un événement externe en direct :
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={triggeringWebhook !== null}
                  onClick={() =>
                    handleSimulateWebhook('stripe.charge.succeeded', {
                      amount: '$299.00',
                      customer: 'enterprise@acme.io',
                      plan: 'Orbit Enterprise Annual',
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  {triggeringWebhook === 'stripe.charge.succeeded'
                    ? '...'
                    : 'Stripe $299'}
                </button>
                <button
                  type="button"
                  disabled={triggeringWebhook !== null}
                  onClick={() =>
                    handleSimulateWebhook('github.push', {
                      repo: githubRepo || 'vercel/next.js',
                      branch: 'main',
                      Author: 'security-bot',
                      commit: 'fix(auth): enforce token expiry check',
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  {triggeringWebhook === 'github.push' ? '...' : 'GitHub Push'}
                </button>
                <button
                  type="button"
                  disabled={triggeringWebhook !== null}
                  onClick={() =>
                    handleSimulateWebhook('form.lead.submitted', {
                      company: 'LVMH Digital',
                      contact: 'marc.dupont@lvmh.fr',
                      need: 'Déploiement de 15 agents IA RAG',
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  {triggeringWebhook === 'form.lead.submitted'
                    ? '...'
                    : 'Lead Form'}
                </button>
              </div>
            </div>

            {/* Agent Management & Danger Zone */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">
                {t.config.managementTitle}
              </h4>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-800">
                    {t.config.agentStatusLabel} ({agent.isActive ? t.config.vmActive : t.config.vmPaused})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t.config.agentStatusSub}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateAgentConfig(agent.agentId, { isActive: !agent.isActive })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>
                    {agent.isActive ? t.config.pauseAgentBtn : t.config.activateAgentBtn}
                  </span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-red-700">
                  {t.config.dangerZone}
                </p>
                {!confirmDeleteAgent ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAgent(true)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t.config.deleteAgentBtn}</span>
                  </button>
                ) : (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 space-y-2">
                    <p className="text-xs text-red-800 font-medium">
                      {t.config.deleteConfirmPrompt} ({agent.name})
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAgentConfirm}
                        className="flex-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        {t.config.confirmDeleteBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAgent(false)}
                        className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {t.config.cancelBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: CONNECTED TOOLS & LIVE OAUTH / SLACK / GITHUB / NOTION HUB */}
        {activeTab === 'tools' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t.config.connectedToolsTitle} ({agent.tools.length}/{TOOL_CATALOG.length})
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  Session: {agent.composioSessionId || 'sess_comp_active'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {agent.tools.length < TOOL_CATALOG.length && (
                  <button
                    type="button"
                    onClick={() => connectAllToolsToAgent(agent.agentId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>
                      {locale === 'fr'
                        ? `Tout connecter (${TOOL_CATALOG.length})`
                        : `Connect All (${TOOL_CATALOG.length})`}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openMarketplace(agent.agentId)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t.config.addToolBtn}</span>
                </button>
              </div>
            </div>

            {/* Mandatory Explicit User Confirmation Modal for Mutating Workspace / Gmail / Notion / Slack Operations */}
            {pendingWorkspaceMutation && (
              <div className="rounded-xl border border-slate-900 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-slate-900">
                  {pendingWorkspaceMutation === 'create_doc'
                    ? 'Confirmer la création d’un document Google Docs ?'
                    : pendingWorkspaceMutation === 'create_sheet'
                      ? 'Confirmer la création d’une feuille Google Sheets ?'
                      : pendingWorkspaceMutation === 'send_gmail'
                        ? `Confirmer l’envoi de l’e-mail à ${gmailTo} ?`
                        : pendingWorkspaceMutation === 'create_gmail_draft'
                          ? `Confirmer la création du brouillon Gmail pour ${gmailTo} ?`
                          : pendingWorkspaceMutation === 'create_notion_page'
                            ? 'Confirmer la création d’une page dans Notion ?'
                            : 'Confirmer l’envoi d’un message sur votre canal Slack ?'}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {pendingWorkspaceMutation === 'post_slack'
                    ? `Un message de synthèse de l'agent "${agent.name}" sera publié sur votre Webhook Slack configuré.`
                    : pendingWorkspaceMutation === 'send_gmail' ||
                        pendingWorkspaceMutation === 'create_gmail_draft'
                      ? `Destinataire : ${gmailTo} · Objet : "${gmailSubject}". Cette action utilise votre connexion Google Workspace OAuth.`
                      : pendingWorkspaceMutation === 'create_notion_page'
                        ? `La page "${agent.name} — ${new Date().toLocaleDateString()}" sera créée dans votre espace Notion (ID parent : ${notionParentId.slice(0, 12)}...).`
                        : `Le fichier "${agent.name} — ${new Date().toLocaleDateString()}" sera créé et mis à jour dans votre compte Google Workspace.`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={executingMutation}
                    onClick={handleConfirmWorkspaceMutation}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {executingMutation ? 'Exécution...' : t.config.confirmBtn}
                  </button>
                  <button
                    type="button"
                    disabled={executingMutation}
                    onClick={() => setPendingWorkspaceMutation(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Google Workspace Live OAuth Card + Gmail Send / Draft */}
            {hasGoogleTool && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Google Workspace OAuth
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Gmail (Read/Send/Draft) · Calendar · Docs · Sheets
                    </p>
                  </div>
                  {workspaceToken ? (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      OAuth Actif
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={connectGoogleWorkspaceOAuth}
                      className="gsi-material-button inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs"
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="h-3.5 w-3.5 shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={syncingWorkspace}
                    onClick={handleSyncLiveWorkspace}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${syncingWorkspace ? 'animate-spin' : ''}`}
                    />
                    <span>Gmail/Cal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingWorkspaceMutation('create_doc')}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <FileText className="h-3 w-3" />
                    <span>+ Doc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingWorkspaceMutation('create_sheet')}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <Table className="h-3 w-3" />
                    <span>+ Sheet</span>
                  </button>
                </div>

                {/* Gmail Send & Draft Composer (gmail.send / gmail.compose) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-700" />
                    <p className="text-[11px] font-bold text-slate-900">
                      Envoi & Brouillons Gmail (gmail.send)
                    </p>
                  </div>
                  <input
                    type="email"
                    value={gmailTo}
                    onChange={(e) => setGmailTo(e.target.value)}
                    placeholder="Destinataire (ex. client@entreprise.com)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={gmailSubject}
                    onChange={(e) => setGmailSubject(e.target.value)}
                    placeholder="Objet de l'e-mail"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
                  />
                  <textarea
                    rows={2}
                    value={gmailBody}
                    onChange={(e) => setGmailBody(e.target.value)}
                    placeholder="Corps du message..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={!gmailTo.trim()}
                      onClick={() =>
                        setPendingWorkspaceMutation('create_gmail_draft')
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Créer Brouillon
                    </button>
                    <button
                      type="button"
                      disabled={!gmailTo.trim()}
                      onClick={() => setPendingWorkspaceMutation('send_gmail')}
                      className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Envoyer E-mail
                    </button>
                  </div>
                </div>

                {createdWorkspaceUrl && (
                  <a
                    href={createdWorkspaceUrl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    <span>{createdWorkspaceUrl.label}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                {liveGmailList.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Gmail ({liveGmailList.length})
                    </p>
                    {liveGmailList.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100"
                      >
                        <p className="font-semibold text-slate-900 truncate">{m.subject}</p>
                        <p className="text-slate-500 truncate">{m.from}</p>
                      </div>
                    ))}
                  </div>
                )}

                {liveCalendarList.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Google Calendar ({liveCalendarList.length})
                    </p>
                    {liveCalendarList.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100"
                      >
                        <p className="font-semibold text-slate-900 truncate">{ev.summary}</p>
                        <p className="text-slate-500 font-mono text-[10px]">{ev.start}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5A. Real GitHub API Card (PRs & Issues) */}
            {(hasGithubTool || agent.agentId === 'agent_code_reviewer') && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">
                    GitHub API Réelle (PRs & Issues)
                  </p>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                    REST v3 Live
                  </span>
                </div>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repo (ex. vercel/next.js)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-900"
                />
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="GitHub Personal Access Token (optionnel pour dépôts publics)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-mono text-slate-900"
                />
                <button
                  type="button"
                  disabled={loadingGithub}
                  onClick={handleFetchGithubLive}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingGithub ? 'animate-spin' : ''}`}
                  />
                  <span>Analyser les vraies Pull Requests & Issues</span>
                </button>

                {githubReport && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {githubReport.repo} · {githubReport.pulls.length} PRs · {githubReport.issues.length} Issues
                    </p>
                    {githubReport.pulls.slice(0, 3).map((pr) => (
                      <a
                        key={pr.number}
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100 hover:border-slate-300"
                      >
                        <p className="font-semibold text-slate-900 truncate">
                          #{pr.number} {pr.title}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          par @{pr.author} · {pr.state}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5B. Real Notion API Card */}
            {(hasNotionTool || agent.tools.length > 0) && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-slate-800" />
                    <p className="text-xs font-bold text-slate-900">
                      Notion API Réelle (Pages & Bases)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    2022-06-28
                  </span>
                </div>
                <input
                  type="password"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder="Notion Integration Token (ntn_... ou secret_...)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-mono text-slate-900"
                />
                <input
                  type="text"
                  value={notionParentId}
                  onChange={(e) => setNotionParentId(e.target.value)}
                  placeholder="ID de la Page ou Base Notion parente (32 caractères)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-mono text-slate-900"
                />
                <button
                  type="button"
                  disabled={!notionToken.trim() || !notionParentId.trim()}
                  onClick={() => setPendingWorkspaceMutation('create_notion_page')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Créer une page Notion avec la synthèse</span>
                </button>
              </div>
            )}

            {/* Real Slack Webhook Card */}
            {hasSlackTool && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-slate-900">
                  Slack Incoming Webhook
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={slackWebhookInput}
                    onChange={(e) => setSlackWebhookInput(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    aria-label="Slack Webhook URL"
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSlackWebhookUrl(slackWebhookInput);
                      addToast({
                        title: 'Webhook Slack enregistré',
                        type: 'success',
                      });
                    }}
                    className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 shrink-0"
                  >
                    OK
                  </button>
                </div>
                {slackWebhookInput.startsWith('https://hooks.slack.com/') && (
                  <button
                    type="button"
                    onClick={() => setPendingWorkspaceMutation('post_slack')}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {locale === 'fr'
                        ? 'Tester l’envoi Slack en direct'
                        : locale === 'it'
                          ? 'Testa invio Slack dal vivo'
                          : 'Test live Slack delivery'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {agent.tools.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  {t.config.noToolsTitle}
                </p>
                <p className="text-xs text-slate-500">
                  {t.config.noToolsSub}
                </p>
                <button
                  type="button"
                  onClick={() => openMarketplace(agent.agentId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t.config.browseMarketplaceBtn}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {agent.tools.map((slug) => {
                  const info = getToolBySlug(slug);
                  const liveReport = toolLiveReports[slug];
                  const readiness = evaluateToolConnectionReadiness(
                    slug,
                    true,
                    toolCredentials,
                    workspaceToken
                  );
                  const hasCustomParamInput = [
                    'reddit',
                    'youtube',
                    'linear',
                    'clickup',
                    'discord',
                    'outlook',
                  ].includes(slug);

                  const paramPlaceholders: Record<string, string> = {
                    reddit: 'Subreddit cible (ex. r/artificial, r/LocalLLaMA)',
                    youtube: 'Chaîne ou sujet YouTube (ex. UC_x5XG1OV2P6uZZ5FSM9Ttw)',
                    linear: 'Cycle ou Équipe Linear (ex. ENG)',
                    clickup: 'Espace ou Liste ClickUp (ex. 901...)',
                    discord: 'URL Webhook Discord (https://discord.com/api/webhooks/...)',
                    outlook: 'Dossier ou boîte Microsoft Outlook (ex. Inbox)',
                  };

                  return (
                    <div
                      key={slug}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                            <ToolIcon slug={slug} className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {info?.name || slug.toUpperCase()}
                            </p>
                            <p
                              className={`text-[11px] font-medium truncate ${
                                readiness.mode === 'verified_live'
                                  ? 'text-emerald-700'
                                  : readiness.mode === 'public_live'
                                    ? 'text-blue-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {liveReport ? liveReport.statusLabel : readiness.badgeTextFr}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={executingToolSlug === slug}
                            onClick={() => handleExecuteLiveTool(slug, false)}
                            aria-label={`Tester ${info?.name || slug}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {executingToolSlug === slug ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                            <span>Tester</span>
                          </button>
                          <button
                            type="button"
                            disabled={executingToolSlug === slug}
                            onClick={() => handleExecuteLiveTool(slug, true)}
                            title="Exécuter et envoyer le rapport dans le chat de l'agent"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                          >
                            <span>→ Chat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => disconnectToolFromAgent(agent.agentId, slug)}
                            aria-label={`Déconnecter ${info?.name || slug}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                          >
                            <Unplug className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {hasCustomParamInput && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <input
                            type="text"
                            value={toolCustomParams[slug] || ''}
                            onChange={(e) =>
                              setToolCustomParams((prev) => ({
                                ...prev,
                                [slug]: e.target.value,
                              }))
                            }
                            placeholder={paramPlaceholders[slug]}
                            aria-label={paramPlaceholders[slug]}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                          />
                          {slug === 'linear' && (
                            <input
                              type="password"
                              value={linearTokenInput}
                              onChange={(e) => setLinearTokenInput(e.target.value)}
                              placeholder="Linear API Key optionnelle (lin_api_...)"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-900"
                            />
                          )}
                        </div>
                      )}

                      {liveReport && (
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>{liveReport.statusLabel}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setToolLiveReports((prev) => {
                                  const next = { ...prev };
                                  delete next[slug];
                                  return next;
                                })
                              }
                              className="text-slate-400 hover:text-slate-700"
                            >
                              Masquer
                            </button>
                          </div>
                          {liveReport.items.map((it) => (
                            <div
                              key={it.id}
                              className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-[11px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900 truncate">
                                  {it.title}
                                </p>
                                <span className="text-[10px] font-mono text-emerald-700 shrink-0">
                                  {it.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                {it.subtitle}
                              </p>
                              <p className="text-[11px] text-slate-600 line-clamp-2">
                                {it.summary}
                              </p>
                              {it.url && (
                                <a
                                  href={it.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-900 hover:underline pt-0.5"
                                >
                                  <span>Ouvrir la source</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULE / ROUTINES */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {/* Real-Time Auto-Scheduler Status Banner */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      autoSchedulerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <p className="text-xs font-bold text-slate-900">
                    {locale === 'fr'
                      ? 'Auto-Scheduler Temps Réel'
                      : locale === 'it'
                        ? 'Auto-Scheduler Tempo Reale'
                        : 'Real-Time Auto-Scheduler'}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                  {autoSchedulerEnabled
                    ? `${locale === 'fr' ? 'Actif · Vérif. auto (5s)' : 'Active · 5s tick'}${
                        lastSchedulerTick ? ` · ${lastSchedulerTick}` : ''
                      }`
                    : locale === 'fr'
                      ? 'En pause'
                      : 'Paused'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoSchedulerEnabled(!autoSchedulerEnabled)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 shrink-0"
              >
                {autoSchedulerEnabled
                  ? locale === 'fr'
                    ? 'Désactiver'
                    : 'Disable'
                  : locale === 'fr'
                    ? 'Activer'
                    : 'Enable'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t.config.scheduledRoutinesTitle} ({routines.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  {t.config.inngestSub}
                </p>
              </div>
              <button
                type="button"
                disabled={cronRunning}
                onClick={async () => {
                  setCronRunning(true);
                  await runHourlyCronCheck(agent.agentId);
                  setCronRunning(false);
                }}
                title={t.config.invokeCronBtn}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3 w-3 ${cronRunning ? 'animate-spin' : ''}`}
                />
                <span>{t.config.invokeCronBtn}</span>
              </button>
            </div>

            {confirmRunRoutine && (
              <div className="rounded-xl border border-slate-900 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-slate-900">
                  {t.config.runNowPrompt} &quot;{confirmRunRoutine.name}&quot; ?
                </p>
                <p className="text-xs text-slate-600">
                  {t.config.runNowSub}{' '}
                  <span className="font-mono font-semibold">
                    {confirmRunRoutine.targetChannel}
                  </span>
                  .
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmRunNow}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {t.config.runBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRunRoutine(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {confirmToggleRoutine && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
                <p className="text-xs font-bold text-amber-950">
                  {confirmToggleRoutine.isActive
                    ? t.config.deactivateRoutine
                    : t.config.activateRoutine}{' '}
                  &quot;{confirmToggleRoutine.name}&quot; ?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const target = confirmToggleRoutine;
                      setConfirmToggleRoutine(null);
                      await toggleRoutineActive(
                        agent.agentId,
                        target.routineId,
                        !target.isActive
                      );
                    }}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t.config.confirmBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmToggleRoutine(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {confirmDeleteRoutine && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-2">
                <p className="text-xs font-bold text-red-900">
                  {t.config.deleteRoutine} &quot;{confirmDeleteRoutine.name}&quot; ?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const target = confirmDeleteRoutine;
                      setConfirmDeleteRoutine(null);
                      await deleteRoutine(agent.agentId, target.routineId);
                    }}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t.config.deleteRoutine}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRoutine(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {routines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-800">
                  {t.config.noRoutinesTitle}
                </p>
                <p className="text-xs text-slate-500">
                  {t.config.noRoutinesSub}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {routines.map((rt) => {
                  const isRunningThis = runningRoutineId === rt.routineId;
                  return (
                    <div
                      key={rt.routineId}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`font-semibold ${
                                rt.isActive ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {rt.isActive ? t.config.vmActive : t.config.vmInactive}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="capitalize text-slate-600">
                              {rt.frequency} · {formatTimeDisplay(rt.time)}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 mt-0.5">
                            {rt.name}
                          </h5>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuRoutineId(
                                openMenuRoutineId === rt.routineId ? null : rt.routineId
                              )
                            }
                            aria-label={`Manage ${rt.name}`}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openMenuRoutineId === rt.routineId && (
                            <div className="absolute right-0 top-7 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuRoutineId(null);
                                  startEditingRoutine(agent.agentId, rt);
                                }}
                                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{t.config.editInChat}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuRoutineId(null);
                                  setConfirmToggleRoutine(rt);
                                }}
                                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Power className="h-3.5 w-3.5" />
                                <span>
                                  {rt.isActive
                                    ? t.config.deactivateRoutine
                                    : t.config.activateRoutine}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuRoutineId(null);
                                  setConfirmDeleteRoutine(rt);
                                }}
                                className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{t.config.deleteRoutine}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {rt.instructions}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-mono tabular-nums">
                          {t.config.nextLabel}:{' '}
                          {new Date(rt.nextRunAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="font-mono text-slate-700">
                          {rt.targetChannel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          {rt.tools.map((slug) => (
                            <div
                              key={slug}
                              title={slug}
                              className="h-6 w-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center"
                            >
                              <ToolIcon slug={slug} className="h-3.5 w-3.5" />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              scheduleRoutineInSeconds(agent.agentId, rt.routineId, 5)
                            }
                            title={
                              locale === 'fr'
                                ? 'Programmer une exécution automatique dans 5 secondes'
                                : 'Schedule automatic execution in 5 seconds'
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            <Zap className="h-3 w-3 text-amber-600" />
                            <span>Auto (5s)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isRunningThis}
                            onClick={() => setConfirmRunRoutine(rt)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {isRunningThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>{t.config.runningInngest}</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                <span>{t.config.runNowBtn}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ROUTINE EXECUTION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                {t.config.historyTitle} ({executions.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                {t.config.historySub}
              </p>
            </div>

            {executions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-xs text-slate-500">
                  {t.config.noHistory}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((exec) => (
                  <div
                    key={exec.executionId}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {exec.status === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <span className="font-semibold capitalize text-slate-900">
                            {exec.status}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="capitalize text-slate-500">
                            {exec.triggerType}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 mt-0.5">
                          {exec.routineName}
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(exec.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      {exec.summary}
                    </p>

                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {t.config.pipelineLabel}
                      </p>
                      {exec.stepsLog.map((st) => (
                        <div
                          key={st.stepKey}
                          className="flex items-center justify-between text-[11px] text-slate-600 py-0.5"
                        >
                          <span className="truncate">{st.label}</span>
                          <span className="font-mono tabular-nums text-[10px] text-emerald-700 shrink-0 ml-2">
                            {st.durationMs}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

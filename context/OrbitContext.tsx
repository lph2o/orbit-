'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  getAccessToken,
  googleSignInWithWorkspaceScopes,
  handleFirestoreError,
  OperationType,
  setCachedAccessToken,
  testFirestoreConnection,
} from '@/lib/firebase';
import {
  AgentChatMessage,
  AgentConfig,
  AgentRoutine,
  FreeAgentApiProvider,
  FreeAgentApiProviderId,
  KnowledgeDocument,
  RoutineDraft,
  RoutineExecution,
  UserProfile,
  VmActionTrace,
  VmStatus,
} from '@/lib/types';
import {
  buildDiceBearAvatarUrl,
  buildVmActionTrace,
  computeNextRunAt,
  createDefaultEventTriggers,
  createDefaultFreeApiProviders,
  filterThreeDayHistory,
  isRoutineDue,
  maskApiKeyDisplay,
  sanitizeId,
  sanitizePersistedFreeApiProviders,
  shouldAutoPauseVm,
  TOOL_CATALOG,
  ToolCredentialRecord,
} from '@/lib/orbit-logic';
import { Dictionary, getDictionary, Locale } from '@/lib/i18n';
import {
  DEMO_AGENTS,
  DEMO_EXECUTIONS,
  DEMO_KNOWLEDGE_DOCS,
  DEMO_MESSAGES,
  DEMO_ROUTINES,
} from '@/lib/seed-data';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: 'info' | 'success' | 'error';
}

interface OrbitContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: Dictionary;
  user: UserProfile;
  authReady: boolean;
  isAuthenticated: boolean;
  agents: AgentConfig[];
  routinesByAgent: Record<string, AgentRoutine[]>;
  executionsByAgent: Record<string, RoutineExecution[]>;
  messagesByAgent: Record<string, AgentChatMessage[]>;
  knowledgeByAgent: Record<string, KnowledgeDocument[]>;
  editingRoutineByAgent: Record<string, AgentRoutine | null>;
  activeVmTraceByAgent: Record<string, VmActionTrace | null>;
  isMarketplaceOpen: boolean;
  marketplaceTargetAgentId: string | null;
  activeVmModalAgentId: string | null;
  toasts: ToastItem[];
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (params: {
    email: string;
    password: string;
    name?: string;
    isSignUp?: boolean;
  }) => Promise<void>;
  signOutUser: () => Promise<void>;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
  openMarketplace: (agentId?: string) => void;
  closeMarketplace: () => void;
  openVmModal: (agentId: string) => void;
  closeVmModal: () => void;
  createAgent: (input: {
    name: string;
    description: string;
    avatarSeed: string;
    tools?: string[];
    model?: AgentConfig['model'];
    temperature?: number;
    tone?: AgentConfig['tone'];
    outputFormat?: AgentConfig['outputFormat'];
    autonomyLevel?: AgentConfig['autonomyLevel'];
    memoryNotes?: string[];
    customVariables?: Record<string, string>;
    vmTimeoutMinutes?: AgentConfig['vmTimeoutMinutes'];
  }) => Promise<AgentConfig>;
  updateAgentConfig: (
    agentId: string,
    patch: Partial<
      Pick<
        AgentConfig,
        | 'name'
        | 'description'
        | 'agentImage'
        | 'isActive'
        | 'handoffTargetAgentId'
        | 'model'
        | 'apiProviderId'
        | 'temperature'
        | 'tone'
        | 'outputFormat'
        | 'responseLanguage'
        | 'autonomyLevel'
        | 'maxDailyActions'
        | 'allowedSlackChannels'
        | 'memoryNotes'
        | 'customVariables'
        | 'eventTriggers'
        | 'vmTimeoutMinutes'
        | 'vmRegion'
        | 'vmStartupScript'
      >
    >
  ) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  connectToolToAgent: (agentId: string, toolSlug: string) => Promise<void>;
  connectAllToolsToAgent: (agentId: string) => Promise<void>;
  disconnectToolFromAgent: (agentId: string, toolSlug: string) => Promise<void>;
  setVmStatusForAgent: (
    agentId: string,
    status: VmStatus,
    trace?: VmActionTrace | null
  ) => Promise<void>;
  browseVmUrl: (agentId: string, queryOrUrl: string) => Promise<VmActionTrace | null>;
  touchVmActivity: (agentId: string) => void;
  appendChatMessage: (agentId: string, message: AgentChatMessage) => Promise<void>;
  clearAgentChat: (agentId: string) => Promise<void>;
  createOrUpdateRoutine: (agentId: string, draft: RoutineDraft) => Promise<AgentRoutine>;
  toggleRoutineActive: (agentId: string, routineId: string, nextActive: boolean) => Promise<void>;
  deleteRoutine: (agentId: string, routineId: string) => Promise<void>;
  startEditingRoutine: (agentId: string, routine: AgentRoutine | null) => void;
  runRoutineNow: (
    agentId: string,
    routineId: string,
    triggerType?: 'manual' | 'scheduled'
  ) => Promise<RoutineExecution | null>;
  runHourlyCronCheck: (agentId: string) => Promise<number>;
  workspaceToken: string | null;
  connectGoogleWorkspaceOAuth: () => Promise<string | null>;
  slackWebhookUrl: string;
  setSlackWebhookUrl: (url: string) => void;
  githubRepo: string;
  setGithubRepo: (repo: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  notionToken: string;
  setNotionToken: (token: string) => void;
  notionParentId: string;
  setNotionParentId: (id: string) => void;
  toolCredentials: Record<string, ToolCredentialRecord>;
  setToolCredential: (slug: string, record: ToolCredentialRecord) => void;
  freeApiProviders: FreeAgentApiProvider[];
  toggleFreeApiProvider: (providerId: FreeAgentApiProviderId, isEnabled?: boolean) => void;
  toggleFreeApiKey: (providerId: FreeAgentApiProviderId, keyId: string, isEnabled?: boolean) => void;
  addOrUpdateFreeApiKey: (
    providerId: FreeAgentApiProviderId,
    rawKey: string,
    keyId?: string
  ) => Promise<void>;
  deleteFreeApiKey: (providerId: FreeAgentApiProviderId, keyId: string) => void;
  verifyFreeApiKeyHealth: (providerId: FreeAgentApiProviderId, keyId: string) => Promise<void>;
  addKnowledgeDocument: (agentId: string, docRecord: KnowledgeDocument) => void;
  deleteKnowledgeDocument: (agentId: string, docRecordId: string) => void;
  runMultiAgentWorkflow: (
    sourceAgentId: string,
    targetAgentId: string,
    topicPrompt?: string
  ) => Promise<RoutineExecution | null>;
  triggerIncomingWebhook: (
    agentId: string,
    eventType: string,
    payload: Record<string, unknown>
  ) => Promise<RoutineExecution | null>;
  autoSchedulerEnabled: boolean;
  setAutoSchedulerEnabled: (enabled: boolean) => void;
  lastSchedulerTick: string;
  scheduleRoutineInSeconds: (agentId: string, routineId: string, secondsFromNow: number) => void;
}

const OrbitContext = createContext<OrbitContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  LOCALE: 'orbit_locale_v1',
  AUTH_SESSION: 'orbit_auth_session_v1',
  AGENTS: 'orbit_agents_v1',
  ROUTINES: 'orbit_routines_v1',
  EXECUTIONS: 'orbit_executions_v1',
  MESSAGES: 'orbit_messages_v1',
  KNOWLEDGE: 'orbit_knowledge_v1',
  SLACK_WEBHOOK: 'orbit_slack_webhook_v1',
  GITHUB_REPO: 'orbit_github_repo_v1',
  GITHUB_TOKEN: 'orbit_github_token_v1',
  NOTION_TOKEN: 'orbit_notion_token_v1',
  NOTION_PARENT: 'orbit_notion_parent_v1',
  TOOL_CREDENTIALS: 'orbit_tool_credentials_v1',
  FREE_API_PROVIDERS: 'orbit_free_api_providers_v2_real',
};

const GUEST_USER: UserProfile = {
  uid: 'unauthenticated_guest',
  name: 'Guest',
  email: '',
  avatarUrl: buildDiceBearAvatarUrl('orbit-guest'),
  credits: 5,
  isDemo: true,
};

export function OrbitProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');
  const [user, setUser] = useState<UserProfile>(GUEST_USER);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [agents, setAgents] = useState<AgentConfig[]>(DEMO_AGENTS);
  const [routinesByAgent, setRoutinesByAgent] = useState<Record<string, AgentRoutine[]>>(DEMO_ROUTINES);
  const [executionsByAgent, setExecutionsByAgent] =
    useState<Record<string, RoutineExecution[]>>(DEMO_EXECUTIONS);
  const [messagesByAgent, setMessagesByAgent] =
    useState<Record<string, AgentChatMessage[]>>(DEMO_MESSAGES);
  const [knowledgeByAgent, setKnowledgeByAgent] =
    useState<Record<string, KnowledgeDocument[]>>(DEMO_KNOWLEDGE_DOCS);
  const [editingRoutineByAgent, setEditingRoutineByAgent] = useState<
    Record<string, AgentRoutine | null>
  >({});
  const [activeVmTraceByAgent, setActiveVmTraceByAgent] = useState<
    Record<string, VmActionTrace | null>
  >({});
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [marketplaceTargetAgentId, setMarketplaceTargetAgentId] = useState<string | null>(null);
  const [activeVmModalAgentId, setActiveVmModalAgentId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);
  const [slackWebhookUrl, setSlackWebhookUrlState] = useState<string>('');
  const [githubRepo, setGithubRepoState] = useState<string>('vercel/next.js');
  const [githubToken, setGithubTokenState] = useState<string>('');
  const [notionToken, setNotionTokenState] = useState<string>('');
  const [notionParentId, setNotionParentIdState] = useState<string>('');
  const [toolCredentials, setToolCredentialsState] = useState<Record<string, ToolCredentialRecord>>({});
  const [freeApiProviders, setFreeApiProviders] = useState<FreeAgentApiProvider[]>(() =>
    createDefaultFreeApiProviders()
  );
  const [autoSchedulerEnabled, setAutoSchedulerEnabled] = useState<boolean>(true);
  const [lastSchedulerTick, setLastSchedulerTick] = useState<string>('');
  const [firestoreReady, setFirestoreReady] = useState<boolean>(false);

  const agentsRef = useRef<AgentConfig[]>(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const hasHydratedFromStorageRef = useRef<boolean>(false);
  const persistedAgentIdsRef = useRef<Set<string>>(new Set());
  const inFlightAgentSyncRef = useRef<Map<string, Promise<boolean>>>(new Map());

  const ensureAgentInFirestore = useCallback(async (agentId: string): Promise<boolean> => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return false;

    const cleanAgentId = sanitizeId(agentId, 'agent');
    const currentUid = sanitizeId(fbUser.uid, 'user');

    if (persistedAgentIdsRef.current.has(cleanAgentId)) {
      return true;
    }

    const existingPromise = inFlightAgentSyncRef.current.get(cleanAgentId);
    if (existingPromise) {
      return existingPromise;
    }

    const syncPromise = (async (): Promise<boolean> => {
      const agentRef = doc(db, 'agents', cleanAgentId);
      try {
        const snap = await getDoc(agentRef);
        if (!snap.exists()) {
          const ag =
            agentsRef.current.find((a) => a.agentId === agentId || a.agentId === cleanAgentId) ||
            DEMO_AGENTS[0];
          await setDoc(agentRef, {
            agentId: cleanAgentId,
            ownerId: currentUid,
            name: (ag.name || 'Orbit Agent').trim().slice(0, 120) || 'Orbit Agent',
            description: (ag.description || '').slice(0, 4000),
            agentImage: (ag.agentImage || buildDiceBearAvatarUrl(cleanAgentId)).slice(0, 500),
            tools: Array.isArray(ag.tools) ? ag.tools.slice(0, 10) : [],
            composioSessionId: (
              ag.composioSessionId || `sess_comp_${Math.random().toString(36).slice(2, 10)}`
            ).slice(0, 128),
            sandboxId: (
              ag.sandboxId || `sbx_e2b_${Math.random().toString(36).slice(2, 10)}`
            ).slice(0, 128),
            vmStatus: ag.vmStatus || 'inactive',
            vmLastActive: (ag.vmLastActive || '').slice(0, 64),
            isActive: Boolean(ag.isActive),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        persistedAgentIdsRef.current.add(cleanAgentId);
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `agents/${cleanAgentId}`);
      } finally {
        inFlightAgentSyncRef.current.delete(cleanAgentId);
      }
    })();

    inFlightAgentSyncRef.current.set(cleanAgentId, syncPromise);
    return syncPromise;
  }, []);

  const t = useMemo(() => getDictionary(locale), [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCALE, nextLocale);
    } catch {}
  }, []);

  const setSlackWebhookUrl = useCallback((url: string) => {
    const clean = url.trim();
    setSlackWebhookUrlState(clean);
    setToolCredentialsState((prev) => {
      const next = {
        ...prev,
        slack: { ...(prev.slack || {}), webhookUrl: clean },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.TOOL_CREDENTIALS, JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.SLACK_WEBHOOK, clean);
    } catch {}
  }, []);

  const setGithubRepo = useCallback((repo: string) => {
    const clean = (repo || 'vercel/next.js').trim();
    setGithubRepoState(clean);
    setToolCredentialsState((prev) => {
      const next = {
        ...prev,
        github: { ...(prev.github || {}), targetParam: clean },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.TOOL_CREDENTIALS, JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, clean);
    } catch {}
  }, []);

  const setGithubToken = useCallback((token: string) => {
    const clean = token.trim();
    setGithubTokenState(clean);
    setToolCredentialsState((prev) => {
      const next = {
        ...prev,
        github: { ...(prev.github || {}), apiToken: clean },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.TOOL_CREDENTIALS, JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, clean);
    } catch {}
  }, []);

  const setNotionToken = useCallback((token: string) => {
    const clean = token.trim();
    setNotionTokenState(clean);
    setToolCredentialsState((prev) => {
      const next = {
        ...prev,
        notion: { ...(prev.notion || {}), apiToken: clean },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.TOOL_CREDENTIALS, JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.NOTION_TOKEN, clean);
    } catch {}
  }, []);

  const setNotionParentId = useCallback((id: string) => {
    const clean = id.trim();
    setNotionParentIdState(clean);
    setToolCredentialsState((prev) => {
      const next = {
        ...prev,
        notion: { ...(prev.notion || {}), targetParam: clean },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.TOOL_CREDENTIALS, JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.NOTION_PARENT, clean);
    } catch {}
  }, []);

  const setToolCredential = useCallback((slug: string, record: ToolCredentialRecord) => {
    const cleanSlug = slug.toLowerCase().trim();
    setToolCredentialsState((prev) => {
      const next = {
        ...prev,
        [cleanSlug]: {
          ...(prev[cleanSlug] || {}),
          ...record,
        },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.TOOL_CREDENTIALS, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (cleanSlug === 'slack' && record.webhookUrl !== undefined) {
      setSlackWebhookUrlState(record.webhookUrl.trim());
      try {
        localStorage.setItem(STORAGE_KEYS.SLACK_WEBHOOK, record.webhookUrl.trim());
      } catch {}
    }
    if (cleanSlug === 'github') {
      if (record.targetParam !== undefined) {
        setGithubRepoState((record.targetParam || 'vercel/next.js').trim());
        try {
          localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, (record.targetParam || 'vercel/next.js').trim());
        } catch {}
      }
      if (record.apiToken !== undefined) {
        setGithubTokenState(record.apiToken.trim());
        try {
          localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, record.apiToken.trim());
        } catch {}
      }
    }
    if (cleanSlug === 'notion') {
      if (record.apiToken !== undefined) {
        setNotionTokenState(record.apiToken.trim());
        try {
          localStorage.setItem(STORAGE_KEYS.NOTION_TOKEN, record.apiToken.trim());
        } catch {}
      }
      if (record.targetParam !== undefined) {
        setNotionParentIdState(record.targetParam.trim());
        try {
          localStorage.setItem(STORAGE_KEYS.NOTION_PARENT, record.targetParam.trim());
        } catch {}
      }
    }
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleFreeApiProvider = useCallback(
    (providerId: FreeAgentApiProviderId, isEnabled?: boolean) => {
      setFreeApiProviders((prev) => {
        const next = prev.map((p) =>
          p.providerId === providerId
            ? { ...p, isEnabled: isEnabled !== undefined ? isEnabled : !p.isEnabled }
            : p
        );
        try {
          localStorage.setItem(STORAGE_KEYS.FREE_API_PROVIDERS, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const toggleFreeApiKey = useCallback(
    (providerId: FreeAgentApiProviderId, keyId: string, isEnabled?: boolean) => {
      setFreeApiProviders((prev) => {
        const next = prev.map((p) => {
          if (p.providerId !== providerId) return p;
          return {
            ...p,
            keys: p.keys.map((k) =>
              k.keyId === keyId
                ? { ...k, isEnabled: isEnabled !== undefined ? isEnabled : !k.isEnabled }
                : k
            ),
          };
        });
        try {
          localStorage.setItem(STORAGE_KEYS.FREE_API_PROVIDERS, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const addOrUpdateFreeApiKey = useCallback(
    async (providerId: FreeAgentApiProviderId, rawKey: string, keyId?: string) => {
      const cleanKey = rawKey.trim();
      if (!cleanKey) return;
      const targetKeyId = keyId || `key_${providerId}_${Date.now()}`;
      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const masked = maskApiKeyDisplay(cleanKey);

      // 1. Insert/update in 'vérification' state (isHealthy: false) before real network verification
      setFreeApiProviders((prev) => {
        const next: FreeAgentApiProvider[] = prev.map((p) => {
          if (p.providerId !== providerId) return p;
          if (keyId) {
            return {
              ...p,
              keys: p.keys.map((k) =>
                k.keyId === keyId
                  ? {
                      ...k,
                      rawKey: cleanKey,
                      maskedKey: masked,
                      isEnabled: true,
                      isHealthy: false,
                      statusText: 'vérification' as const,
                      lastError: undefined,
                      checkedAtTime: nowTime,
                    }
                  : k
              ),
            };
          }
          return {
            ...p,
            keys: [
              ...p.keys,
              {
                keyId: targetKeyId,
                rawKey: cleanKey,
                maskedKey: masked,
                isEnabled: true,
                isHealthy: false,
                statusText: 'vérification' as const,
                lastError: undefined,
                checkedAtTime: nowTime,
              },
            ],
          };
        });
        return next;
      });

      // 2. Perform real live HTTP verification against the provider's official API
      try {
        const res = await fetch('/api/agent/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            rawKey: cleanKey,
          }),
        });
        const data = await res.json();
        const isHealthy = Boolean(res.ok && data.healthy);
        const checkedTime = data.checkedAtTime || nowTime;

        setFreeApiProviders((prev) => {
          const next: FreeAgentApiProvider[] = prev.map((p) => {
            if (p.providerId !== providerId) return p;
            const updatedKeys = p.keys.map((k) =>
              k.keyId === targetKeyId
                ? {
                    ...k,
                    isHealthy,
                    statusText: (isHealthy ? 'sain' : 'erreur') as 'sain' | 'erreur',
                    lastError: isHealthy ? undefined : data.errorDetail || 'fetch failed',
                    checkedAtTime: checkedTime,
                  }
                : k
            );
            const hasHealthyKey = updatedKeys.some((k) => k.isEnabled && k.isHealthy);
            return {
              ...p,
              isEnabled: hasHealthyKey,
              keys: updatedKeys,
            };
          });
          try {
            localStorage.setItem(STORAGE_KEYS.FREE_API_PROVIDERS, JSON.stringify(next));
          } catch {}
          return next;
        });

        addToast({
          title: isHealthy
            ? `Clé API vérifiée en direct (sain)`
            : `Clé API refusée (${data.errorDetail || 'fetch failed'})`,
          description: isHealthy
            ? `${data.modeLabel || providerId} · ${masked}`
            : `Vérifiez que votre clé ${providerId} est valide et active.`,
          type: isHealthy ? 'success' : 'error',
        });
      } catch {
        setFreeApiProviders((prev) => {
          const next: FreeAgentApiProvider[] = prev.map((p) => {
            if (p.providerId !== providerId) return p;
            return {
              ...p,
              isEnabled: false,
              keys: p.keys.map((k) =>
                k.keyId === targetKeyId
                  ? {
                      ...k,
                      isHealthy: false,
                      statusText: 'erreur' as const,
                      lastError: 'fetch failed',
                      checkedAtTime: nowTime,
                    }
                  : k
              ),
            };
          });
          try {
            localStorage.setItem(STORAGE_KEYS.FREE_API_PROVIDERS, JSON.stringify(next));
          } catch {}
          return next;
        });
        addToast({
          title: 'Échec de vérification réseau (fetch failed)',
          type: 'error',
        });
      }
    },
    [addToast]
  );

  const deleteFreeApiKey = useCallback(
    (providerId: FreeAgentApiProviderId, keyId: string) => {
      setFreeApiProviders((prev) => {
        const next: FreeAgentApiProvider[] = prev.map((p) => {
          if (p.providerId !== providerId) return p;
          const remainingKeys = p.keys.filter((k) => k.keyId !== keyId);
          const hasHealthy = remainingKeys.some((k) => k.isEnabled && k.isHealthy);
          return {
            ...p,
            isEnabled: hasHealthy ? p.isEnabled : false,
            keys: remainingKeys,
          };
        });
        try {
          localStorage.setItem(STORAGE_KEYS.FREE_API_PROVIDERS, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const verifyFreeApiKeyHealth = useCallback(
    async (providerId: FreeAgentApiProviderId, keyId: string) => {
      const provider = freeApiProviders.find((p) => p.providerId === providerId);
      const keyEntry = provider?.keys.find((k) => k.keyId === keyId);
      if (!provider || !keyEntry) return;

      try {
        const res = await fetch('/api/agent/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            rawKey: keyEntry.rawKey,
          }),
        });
        const data = await res.json();
        const isHealthy = Boolean(res.ok && data.healthy);
        const nowTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        setFreeApiProviders((prev) => {
          const next: FreeAgentApiProvider[] = prev.map((p) => {
            if (p.providerId !== providerId) return p;
            const updatedKeys = p.keys.map((k) =>
              k.keyId === keyId
                ? {
                    ...k,
                    isHealthy,
                    statusText: (isHealthy ? 'sain' : 'erreur') as 'sain' | 'erreur',
                    lastError: isHealthy ? undefined : data.errorDetail || 'fetch failed',
                    checkedAtTime: data.checkedAtTime || nowTime,
                  }
                : k
            );
            const hasHealthy = updatedKeys.some((k) => k.isEnabled && k.isHealthy);
            return {
              ...p,
              isEnabled: hasHealthy ? p.isEnabled : false,
              keys: updatedKeys,
            };
          });
          try {
            localStorage.setItem(STORAGE_KEYS.FREE_API_PROVIDERS, JSON.stringify(next));
          } catch {}
          return next;
        });

        addToast({
          title: isHealthy
            ? `${provider.name} · Clé opérationnelle (sain)`
            : `${provider.name} · ${data.errorDetail || 'fetch failed'}`,
          description: data.latencyMs
            ? `Latence vérifiée : ${data.latencyMs}ms · ${data.modeLabel || ''}`
            : undefined,
          type: isHealthy ? 'success' : 'error',
        });
      } catch {
        addToast({
          title: `${provider.name} · fetch failed`,
          type: 'error',
        });
      }
    },
    [freeApiProviders, addToast]
  );

  const addKnowledgeDocument = useCallback(
    (agentId: string, docRecord: KnowledgeDocument) => {
      setKnowledgeByAgent((prev) => ({
        ...prev,
        [agentId]: [docRecord, ...(prev[agentId] || [])],
      }));
      addToast({
        title:
          locale === 'fr'
            ? 'Document indexé dans la base RAG'
            : locale === 'it'
              ? 'Documento indicizzato nella Knowledge Base RAG'
              : 'Document indexed in RAG Knowledge Base',
        description: `${docRecord.name} (${docRecord.fileType.toUpperCase()})`,
        type: 'success',
      });
    },
    [addToast, locale]
  );

  const deleteKnowledgeDocument = useCallback(
    (agentId: string, docId: string) => {
      setKnowledgeByAgent((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] || []).filter((d) => d.docId !== docId),
      }));
      addToast({
        title:
          locale === 'fr'
            ? 'Document retiré de la base RAG'
            : locale === 'it'
              ? 'Documento rimosso dalla Knowledge Base RAG'
              : 'Document removed from RAG Knowledge Base',
        type: 'info',
      });
    },
    [addToast, locale]
  );

  // Load persisted state from localStorage on client mount
  useEffect(() => {
    testFirestoreConnection();
    queueMicrotask(() => {
      try {
        const savedLocale = localStorage.getItem(STORAGE_KEYS.LOCALE);
        if (savedLocale === 'fr' || savedLocale === 'it' || savedLocale === 'en') {
          setLocaleState(savedLocale);
        }
        const savedSlackWebhook = localStorage.getItem(STORAGE_KEYS.SLACK_WEBHOOK);
        if (savedSlackWebhook) {
          setSlackWebhookUrlState(savedSlackWebhook);
        }
        const savedGhRepo = localStorage.getItem(STORAGE_KEYS.GITHUB_REPO);
        if (savedGhRepo) setGithubRepoState(savedGhRepo);
        const savedGhToken = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
        if (savedGhToken) setGithubTokenState(savedGhToken);
        const savedNotionToken = localStorage.getItem(STORAGE_KEYS.NOTION_TOKEN);
        if (savedNotionToken) setNotionTokenState(savedNotionToken);
        const savedNotionParent = localStorage.getItem(STORAGE_KEYS.NOTION_PARENT);
        if (savedNotionParent) setNotionParentIdState(savedNotionParent);

        const savedToolCreds = localStorage.getItem(STORAGE_KEYS.TOOL_CREDENTIALS);
        let initialCreds: Record<string, ToolCredentialRecord> = {};
        if (savedToolCreds) {
          try {
            initialCreds = JSON.parse(savedToolCreds) || {};
          } catch {}
        }
        if (savedSlackWebhook) {
          initialCreds.slack = { ...(initialCreds.slack || {}), webhookUrl: savedSlackWebhook };
        }
        if (savedGhRepo || savedGhToken) {
          initialCreds.github = {
            ...(initialCreds.github || {}),
            targetParam: savedGhRepo || initialCreds.github?.targetParam || 'vercel/next.js',
            apiToken: savedGhToken || initialCreds.github?.apiToken || '',
          };
        }
        if (savedNotionToken || savedNotionParent) {
          initialCreds.notion = {
            ...(initialCreds.notion || {}),
            apiToken: savedNotionToken || initialCreds.notion?.apiToken || '',
            targetParam: savedNotionParent || initialCreds.notion?.targetParam || '',
          };
        }
        setToolCredentialsState(initialCreds);

        const savedAgents = localStorage.getItem(STORAGE_KEYS.AGENTS);
        const savedRoutines = localStorage.getItem(STORAGE_KEYS.ROUTINES);
        const savedExecutions = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
        const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        const savedKnowledge = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE);

        if (savedAgents) {
          const parsed = JSON.parse(savedAgents);
          if (Array.isArray(parsed) && parsed.length > 0) setAgents(parsed);
        } else {
          const nowIso = new Date().toISOString();
          setAgents((prev) =>
            prev.map((ag) => (ag.vmStatus === 'active' ? { ...ag, vmLastActive: nowIso } : ag))
          );
        }
        if (savedRoutines) {
          const parsedRoutines: Record<string, AgentRoutine[]> = JSON.parse(savedRoutines);
          const nowMs = Date.now();
          const normalizedRoutines: Record<string, AgentRoutine[]> = {};
          for (const [k, list] of Object.entries(parsedRoutines)) {
            normalizedRoutines[k] = (list || []).map((r) => {
              const nextMs = Date.parse(r.nextRunAt || '');
              if (Number.isNaN(nextMs) || nextMs <= nowMs) {
                return {
                  ...r,
                  nextRunAt: computeNextRunAt(r.frequency, r.time, r.days, new Date()),
                };
              }
              return r;
            });
          }
          setRoutinesByAgent(normalizedRoutines);
        }
        if (savedExecutions) {
          const parsedExecs: Record<string, RoutineExecution[]> = JSON.parse(savedExecutions);
          const cleanedExecs: Record<string, RoutineExecution[]> = {};
          for (const [k, list] of Object.entries(parsedExecs)) {
            cleanedExecs[k] = filterThreeDayHistory(list);
          }
          setExecutionsByAgent(cleanedExecs);
        }
        if (savedMessages) {
          const parsedMsgs: Record<string, AgentChatMessage[]> = JSON.parse(savedMessages);
          if (parsedMsgs && typeof parsedMsgs === 'object') {
            setMessagesByAgent((prev) => ({ ...prev, ...parsedMsgs }));
          }
        }
        if (savedKnowledge) {
          const parsedKnowledge: Record<string, KnowledgeDocument[]> = JSON.parse(savedKnowledge);
          if (parsedKnowledge && typeof parsedKnowledge === 'object') {
            setKnowledgeByAgent((prev) => ({ ...prev, ...parsedKnowledge }));
          }
        }
        try {
          localStorage.removeItem('orbit_free_api_providers_v1');
        } catch {}
        const savedFreeProviders = localStorage.getItem(STORAGE_KEYS.FREE_API_PROVIDERS);
        if (savedFreeProviders) {
          try {
            const parsedProviders = JSON.parse(savedFreeProviders);
            if (Array.isArray(parsedProviders) && parsedProviders.length > 0) {
              setFreeApiProviders(sanitizePersistedFreeApiProviders(parsedProviders));
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to hydrate local Orbit state:', e);
      } finally {
        setTimeout(() => {
          hasHydratedFromStorageRef.current = true;
        }, 50);
      }
    });
  }, []);

  // Persist to localStorage (only after initial hydration completes so DEMO_* never overwrites saved data)
  useEffect(() => {
    if (!hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
    } catch {}
  }, [agents]);

  useEffect(() => {
    if (!hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routinesByAgent));
    } catch {}
  }, [routinesByAgent]);

  useEffect(() => {
    if (!hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executionsByAgent));
    } catch {}
  }, [executionsByAgent]);

  useEffect(() => {
    if (!hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesByAgent));
    } catch {}
  }, [messagesByAgent]);

  useEffect(() => {
    if (!hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE, JSON.stringify(knowledgeByAgent));
    } catch {}
  }, [knowledgeByAgent]);

  // Listen for Firebase Auth state and load user agents + subcollections from Firestore
  useEffect(() => {
    let resolved = false;

    const applyLocalOrAutostartFallback = () => {
      if (resolved) return;
      resolved = true;
      try {
        const params =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        if (params?.get('autostart') === '1') {
          const demoProfile: UserProfile = {
            uid: 'user_demo_autostart',
            name: 'Abdoulaye Thiam',
            email: 'abdoulaye@orbit.ai',
            avatarUrl: buildDiceBearAvatarUrl('abdoulaye-orbit'),
            credits: 5,
            isDemo: true,
          };
          localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(demoProfile));
          setUser(demoProfile);
          setIsAuthenticated(true);
          setAuthReady(true);
          return;
        }

        const savedSession = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        if (savedSession) {
          const parsedUser: UserProfile = JSON.parse(savedSession);
          if (parsedUser && parsedUser.email) {
            setUser(parsedUser);
            setIsAuthenticated(true);
            setAuthReady(true);
            return;
          }
        }
      } catch {}

      setUser(GUEST_USER);
      setIsAuthenticated(false);
      setAuthReady(true);
    };

    const fallbackTimer = setTimeout(applyLocalOrAutostartFallback, 500);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(fallbackTimer);
      if (!fbUser) {
        setCachedAccessToken(null);
        setWorkspaceToken(null);
        applyLocalOrAutostartFallback();
        return;
      }
      resolved = true;

      setWorkspaceToken(getAccessToken());

      const uid = sanitizeId(fbUser.uid, 'user');
      const displayName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'Orbit User').slice(0, 120);
      const email = (fbUser.email || 'user@orbit.dev').slice(0, 254);
      const avatarUrl = (
        fbUser.photoURL || buildDiceBearAvatarUrl(uid)
      ).slice(0, 500);

      const authenticatedProfile: UserProfile = {
        uid,
        name: displayName,
        email,
        avatarUrl,
        credits: 5,
        isDemo: false,
      };

      setUser(authenticatedProfile);
      setIsAuthenticated(true);
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(authenticatedProfile));
      } catch {}

      if (fbUser.emailVerified) {
        const pubRef = doc(db, 'users', uid, 'public', 'profile');
        const privRef = doc(db, 'users', uid, 'private', 'info');
        try {
          const pubSnap = await getDoc(pubRef);
          if (!pubSnap.exists()) {
            await setDoc(pubRef, {
              uid,
              name: displayName,
              avatarUrl,
              credits: 5,
              createdAt: serverTimestamp(),
            });
          }
          const privSnap = await getDoc(privRef);
          if (!privSnap.exists()) {
            await setDoc(privRef, {
              uid,
              email,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }

        // Load user's agents and their routines/executions/messages from Firestore
        try {
          const q = query(collection(db, 'agents'), where('ownerId', '==', uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const loadedAgents: AgentConfig[] = snap.docs.map((d) => {
              const data = d.data();
              const existingLocal = agentsRef.current.find((a) => a.agentId === data.agentId);
              return {
                ...(existingLocal || {}),
                agentId: data.agentId,
                ownerId: data.ownerId,
                name: data.name,
                description: data.description,
                agentImage: data.agentImage,
                tools: Array.isArray(data.tools) ? data.tools : [],
                composioSessionId: data.composioSessionId || '',
                sandboxId: data.sandboxId || '',
                vmStatus: (data.vmStatus as VmStatus) || 'inactive',
                vmLastActive: data.vmLastActive || '',
                isActive: Boolean(data.isActive),
                model: existingLocal?.model || 'gemini-3-flash-preview',
                temperature: existingLocal?.temperature ?? 0.2,
                tone: existingLocal?.tone || 'executive',
                outputFormat: existingLocal?.outputFormat || 'bullets',
                responseLanguage: existingLocal?.responseLanguage || 'auto',
                autonomyLevel: existingLocal?.autonomyLevel || 'copilot',
                maxDailyActions: existingLocal?.maxDailyActions ?? 25,
                allowedSlackChannels: existingLocal?.allowedSlackChannels || '#new-channel, #general',
                memoryNotes: existingLocal?.memoryNotes || [],
                customVariables: existingLocal?.customVariables || {},
                eventTriggers: existingLocal?.eventTriggers || createDefaultEventTriggers(),
                vmTimeoutMinutes: existingLocal?.vmTimeoutMinutes ?? 5,
                vmRegion: existingLocal?.vmRegion || 'eu-west-1',
                vmStartupScript: existingLocal?.vmStartupScript || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            });
            setAgents(loadedAgents);

            const nextRoutines: Record<string, AgentRoutine[]> = {};
            const nextExecutions: Record<string, RoutineExecution[]> = {};
            const nextMessages: Record<string, AgentChatMessage[]> = {};

            for (const ag of loadedAgents) {
              persistedAgentIdsRef.current.add(ag.agentId);

              // 1. Load routines subcollection with mandatory ownerId filter for Firestore rules
              try {
                const rQuery = query(
                  collection(db, 'agents', ag.agentId, 'routines'),
                  where('ownerId', '==', uid)
                );
                const rSnap = await getDocs(rQuery);
                if (!rSnap.empty) {
                  nextRoutines[ag.agentId] = rSnap.docs.map((docItem) => {
                    const rd = docItem.data();
                    return {
                      routineId: rd.routineId,
                      agentId: rd.agentId,
                      ownerId: rd.ownerId,
                      name: rd.name,
                      goal: rd.goal,
                      instructions: rd.instructions,
                      frequency: rd.frequency,
                      time: rd.time,
                      timezone: rd.timezone,
                      days: Array.isArray(rd.days) ? rd.days : [],
                      tools: Array.isArray(rd.tools) ? rd.tools : [],
                      targetChannel: rd.targetChannel || '#new-channel',
                      isActive: Boolean(rd.isActive),
                      nextRunAt: rd.nextRunAt || '',
                      lastRunAt: rd.lastRunAt || '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                  });
                }
              } catch (rErr) {
                console.warn('Routines subcollection load warning:', rErr);
              }

              // 2. Load executions subcollection with mandatory ownerId filter
              try {
                const eQuery = query(
                  collection(db, 'agents', ag.agentId, 'executions'),
                  where('ownerId', '==', uid)
                );
                const eSnap = await getDocs(eQuery);
                if (!eSnap.empty) {
                  nextExecutions[ag.agentId] = eSnap.docs.map((docItem) => {
                    const ed = docItem.data();
                    let stepsLog = [];
                    try {
                      stepsLog = JSON.parse(ed.stepsLog || '[]');
                    } catch {}
                    return {
                      executionId: ed.executionId,
                      routineId: ed.routineId,
                      routineName: ed.routineName,
                      agentId: ed.agentId,
                      ownerId: ed.ownerId,
                      status: ed.status,
                      triggerType: ed.triggerType,
                      summary: ed.summary,
                      stepsLog,
                      startedAt: ed.startedAt,
                      completedAt: ed.completedAt,
                      createdAt: ed.completedAt || new Date().toISOString(),
                    };
                  });
                }
              } catch (eErr) {
                console.warn('Executions subcollection load warning:', eErr);
              }

              // 3. Load messages subcollection with mandatory ownerId filter and chronological sorting
              try {
                const mQuery = query(
                  collection(db, 'agents', ag.agentId, 'messages'),
                  where('ownerId', '==', uid)
                );
                const mSnap = await getDocs(mQuery);
                if (!mSnap.empty) {
                  const loadedMsgs: AgentChatMessage[] = mSnap.docs.map((docItem) => {
                    const md = docItem.data();
                    let structured = undefined;
                    try {
                      if (md.payloadJson) structured = JSON.parse(md.payloadJson);
                    } catch {}
                    const tsFromFirestore =
                      typeof md.createdAt?.toDate === 'function'
                        ? md.createdAt.toDate().toISOString()
                        : undefined;
                    const idDigitsMatch = String(md.messageId || '').match(/(\d{10,15})/);
                    const tsFromId = idDigitsMatch
                      ? new Date(Number(idDigitsMatch[1])).toISOString()
                      : undefined;
                    return {
                      messageId: md.messageId,
                      agentId: md.agentId,
                      ownerId: md.ownerId,
                      role: md.role,
                      content: md.content,
                      responseType: md.responseType,
                      structured,
                      executionMeta: structured?.executionMeta,
                      timeLabel: md.timeLabel || '',
                      createdAt: tsFromFirestore || tsFromId || new Date().toISOString(),
                    };
                  });
                  nextMessages[ag.agentId] = loadedMsgs;
                }
              } catch (mErr) {
                console.warn('Messages subcollection load warning:', mErr);
              }
            }

            setRoutinesByAgent((prev) => ({ ...prev, ...nextRoutines }));
            setExecutionsByAgent((prev) => ({ ...prev, ...nextExecutions }));
            setMessagesByAgent((prev) => {
              const merged: Record<string, AgentChatMessage[]> = { ...prev };
              for (const [agId, fsMsgs] of Object.entries(nextMessages)) {
                const localMsgs = prev[agId] || [];
                const byId = new Map<string, AgentChatMessage>();
                for (const m of localMsgs) {
                  byId.set(m.messageId, m);
                }
                for (const m of fsMsgs) {
                  const existing = byId.get(m.messageId);
                  if (!existing) {
                    byId.set(m.messageId, m);
                  } else if (!existing.structured && m.structured) {
                    byId.set(m.messageId, { ...existing, structured: m.structured });
                  }
                }
                const combined = Array.from(byId.values()).sort((a, b) => {
                  const getSortMs = (item: AgentChatMessage) => {
                    const idMatch = String(item.messageId || '').match(/(\d{10,15})/);
                    if (idMatch) return Number(idMatch[1]);
                    const parsed = Date.parse(item.createdAt || '');
                    return Number.isNaN(parsed) ? 0 : parsed;
                  };
                  return getSortMs(a) - getSortMs(b);
                });
                merged[agId] = combined;
              }
              try {
                localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          } else {
            // Seed starter agents into Firestore for this authenticated user so subcollection writes succeed
            setAgents((prev) => prev.map((ag) => ({ ...ag, ownerId: uid })));
            for (const ag of agentsRef.current) {
              try {
                await ensureAgentInFirestore(ag.agentId);
              } catch (seedErr) {
                console.warn('Initial agent seed warning:', seedErr);
              }
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'agents');
        }
      }

      setFirestoreReady(true);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [ensureAgentInFirestore]);

  // 2-minute E2B Cloud VM Desktop auto-pause timer (Chapter 17)
  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setAgents((prev) => {
        let changed = false;
        const next = prev.map((ag) => {
          if (shouldAutoPauseVm(ag.vmStatus, ag.vmLastActive, nowMs, ag.vmTimeoutMinutes ?? 2)) {
            changed = true;
            return {
              ...ag,
              vmStatus: 'paused' as VmStatus,
            };
          }
          return ag;
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { accessToken } = await googleSignInWithWorkspaceScopes();
      setWorkspaceToken(accessToken);
      addToast({
        title: t.toasts.signedInTitle,
        description: t.toasts.signedInDesc,
        type: 'success',
      });
    } catch (error) {
      console.warn('Google sign-in popup error:', error);
      addToast({
        title: 'OAuth Popup Blocked / Closed',
        description:
          locale === 'fr'
            ? 'Veuillez utiliser le formulaire e-mail et mot de passe ci-dessous ou autoriser la fenêtre pop-up.'
            : locale === 'it'
              ? 'Utilizza il modulo email e password qui sotto oppure consenti i popup.'
              : 'Please use the email & password form below or allow popups.',
        type: 'info',
      });
    }
  }, [addToast, locale, t]);

  const connectGoogleWorkspaceOAuth = useCallback(async (): Promise<string | null> => {
    try {
      const { accessToken } = await googleSignInWithWorkspaceScopes();
      setWorkspaceToken(accessToken);
      addToast({
        title: 'Google Workspace OAuth',
        description:
          locale === 'fr'
            ? 'Gmail, Google Calendar, Google Docs et Google Sheets sont connectés.'
            : locale === 'it'
              ? 'Gmail, Google Calendar, Google Docs e Google Sheets sono connessi.'
              : 'Gmail, Google Calendar, Google Docs, and Google Sheets are connected.',
        type: 'success',
      });
      return accessToken;
    } catch (error) {
      console.warn('Google Workspace OAuth error:', error);
      addToast({
        title: 'Google Workspace OAuth',
        description:
          locale === 'fr'
            ? 'Veuillez autoriser la fenêtre pop-up Google pour accorder l’accès Workspace.'
            : locale === 'it'
              ? 'Consenti il popup di Google per autorizzare Google Workspace.'
              : 'Please allow the Google popup window to grant Workspace permissions.',
        type: 'info',
      });
      return null;
    }
  }, [addToast, locale]);

  const signInWithCredentials = useCallback(
    async ({
      email,
      password,
      name,
      isSignUp,
    }: {
      email: string;
      password: string;
      name?: string;
      isSignUp?: boolean;
    }) => {
      const cleanEmail = email.trim().toLowerCase();
      const displayName = (name?.trim() || cleanEmail.split('@')[0] || 'Orbit User').slice(0, 120);

      try {
        if (isSignUp) {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          if (name?.trim()) {
            await updateProfile(cred.user, { displayName });
          }
        } else {
          await signInWithEmailAndPassword(auth, cleanEmail, password);
        }
        addToast({
          title: t.toasts.signedInTitle,
          description: cleanEmail,
          type: 'success',
        });
      } catch (fbErr: unknown) {
        const code = (fbErr as { code?: string })?.code || '';
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          throw new Error(
            locale === 'fr'
              ? 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.'
              : locale === 'it'
                ? 'Credenziali non valide. Controlla email e password.'
                : 'Invalid credentials. Please check your email and password.'
          );
        }
        // If Email/Password provider is not enabled yet in Firebase Console, create an authenticated session
        const uid = sanitizeId(`user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, 'user');
        const sessionProfile: UserProfile = {
          uid,
          name: displayName,
          email: cleanEmail,
          avatarUrl: buildDiceBearAvatarUrl(uid),
          credits: 5,
          isDemo: true,
        };
        setUser(sessionProfile);
        setIsAuthenticated(true);
        try {
          localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(sessionProfile));
        } catch {}
        addToast({
          title: t.toasts.signedInTitle,
          description: cleanEmail,
          type: 'success',
        });
      }
    },
    [locale, t, addToast]
  );

  const signOutUser = useCallback(async () => {
    try {
      setCachedAccessToken(null);
      setWorkspaceToken(null);
      try {
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      } catch {}
      await signOut(auth);
      setUser(GUEST_USER);
      setIsAuthenticated(false);
      addToast({
        title: t.toasts.signedOutTitle,
        description: t.toasts.signedOutDesc,
        type: 'info',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setCachedAccessToken(null);
      setWorkspaceToken(null);
      setUser(GUEST_USER);
      setIsAuthenticated(false);
    }
  }, [addToast, t]);

  const openMarketplace = useCallback((agentId?: string) => {
    if (agentId) setMarketplaceTargetAgentId(agentId);
    setIsMarketplaceOpen(true);
  }, []);

  const closeMarketplace = useCallback(() => {
    setIsMarketplaceOpen(false);
  }, []);

  const openVmModal = useCallback((agentId: string) => {
    setActiveVmModalAgentId(agentId);
  }, []);

  const closeVmModal = useCallback(() => {
    setActiveVmModalAgentId(null);
  }, []);

  const createAgent = useCallback(
    async ({
      name,
      description,
      avatarSeed,
      tools = [],
      model = 'gemini-3-flash-preview',
      temperature = 0.2,
      tone = 'executive',
      outputFormat = 'bullets',
      autonomyLevel = 'copilot',
      memoryNotes = [],
      customVariables = {},
      vmTimeoutMinutes = 5,
    }: {
      name: string;
      description: string;
      avatarSeed: string;
      tools?: string[];
      model?: AgentConfig['model'];
      temperature?: number;
      tone?: AgentConfig['tone'];
      outputFormat?: AgentConfig['outputFormat'];
      autonomyLevel?: AgentConfig['autonomyLevel'];
      memoryNotes?: string[];
      customVariables?: Record<string, string>;
      vmTimeoutMinutes?: AgentConfig['vmTimeoutMinutes'];
    }): Promise<AgentConfig> => {
      const cleanName = name.trim().slice(0, 120) || 'Untitled Agent';
      const cleanDesc = (description || '').trim().slice(0, 4000);
      const agentId = sanitizeId(`agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, 'agent');
      const nowIso = new Date().toISOString();
      const agentImage = buildDiceBearAvatarUrl(avatarSeed || agentId).slice(0, 500);
      const composioSessionId = `sess_comp_${Math.random().toString(36).slice(2, 10)}`;
      const sandboxId = `sbx_e2b_${Math.random().toString(36).slice(2, 10)}`;
      const cleanTools = Array.isArray(tools)
        ? Array.from(new Set(tools.map((s) => s.toLowerCase().trim()))).slice(0, 20)
        : [];

      const newAgent: AgentConfig = {
        agentId,
        ownerId: sanitizeId(user.uid, 'user'),
        name: cleanName,
        description: cleanDesc,
        agentImage,
        tools: cleanTools,
        composioSessionId,
        sandboxId,
        vmStatus: 'inactive',
        vmLastActive: '',
        isActive: true,
        model,
        temperature,
        tone,
        outputFormat,
        responseLanguage: 'auto',
        autonomyLevel,
        maxDailyActions: 25,
        allowedSlackChannels: '#new-channel, #general',
        memoryNotes,
        customVariables,
        eventTriggers: createDefaultEventTriggers(),
        vmTimeoutMinutes,
        vmRegion: 'eu-west-1',
        vmStartupScript: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setAgents((prev) => [newAgent, ...prev]);
      setRoutinesByAgent((prev) => ({ ...prev, [agentId]: [] }));
      setExecutionsByAgent((prev) => ({ ...prev, [agentId]: [] }));

      const welcomeContent =
        locale === 'fr'
          ? `Bonjour ! Je suis **${cleanName}**. ${cleanDesc ? `Mon objectif : *${cleanDesc}*` : 'Je suis prêt à connecter vos outils, planifier des routines et utiliser mon Cloud VM Desktop.'}\n\nComment puis-je vous aider aujourd'hui ?`
          : locale === 'it'
            ? `Ciao! Sono **${cleanName}**. ${cleanDesc ? `Il mio obiettivo: *${cleanDesc}*` : 'Sono pronto a connettere i tuoi strumenti, pianificare routine ed eseguire attività sul mio Cloud VM Desktop.'}\n\nCome posso aiutarti oggi?`
            : `Hello! I am **${cleanName}**. ${cleanDesc ? `My objective: *${cleanDesc}*` : 'I am ready to connect tools, schedule recurring routines, and run tasks on my Cloud VM Desktop.'}\n\nHow can I help you today?`;

      const welcomeMsg: AgentChatMessage = {
        messageId: sanitizeId(`msg_welcome_${Date.now()}`, 'msg'),
        agentId,
        ownerId: newAgent.ownerId,
        role: 'agent',
        content: welcomeContent,
        responseType: 'message',
        timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: nowIso,
      };
      setMessagesByAgent((prev) => {
        const next = { ...prev, [agentId]: [welcomeMsg] };
        try {
          localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
        } catch {}
        return next;
      });

      if (auth.currentUser?.emailVerified) {
        const currentUid = sanitizeId(auth.currentUser.uid, 'user');
        const agentRef = doc(db, 'agents', agentId);
        try {
          await setDoc(agentRef, {
            agentId: newAgent.agentId,
            ownerId: currentUid,
            name: newAgent.name,
            description: newAgent.description,
            agentImage: newAgent.agentImage,
            tools: newAgent.tools.slice(0, 10),
            composioSessionId: newAgent.composioSessionId,
            sandboxId: newAgent.sandboxId,
            vmStatus: newAgent.vmStatus,
            vmLastActive: newAgent.vmLastActive,
            isActive: newAgent.isActive,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          persistedAgentIdsRef.current.add(agentId);
          await setDoc(doc(db, 'agents', agentId, 'messages', welcomeMsg.messageId), {
            messageId: welcomeMsg.messageId,
            agentId,
            ownerId: currentUid,
            role: 'agent',
            content: welcomeMsg.content.slice(0, 8000),
            responseType: 'message',
            payloadJson: '{}',
            timeLabel: welcomeMsg.timeLabel.slice(0, 64),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `agents/${agentId}`);
        }
      }

      addToast({
        title: t.toasts.agentCreatedTitle,
        description: `${cleanName} (${sandboxId})`,
        type: 'success',
      });

      return newAgent;
    },
    [user, locale, t, addToast]
  );

  const updateAgentConfig = useCallback(
    async (
      agentId: string,
      patch: Partial<
        Pick<
          AgentConfig,
          | 'name'
          | 'description'
          | 'agentImage'
          | 'isActive'
          | 'handoffTargetAgentId'
          | 'model'
          | 'temperature'
          | 'tone'
          | 'outputFormat'
          | 'responseLanguage'
          | 'autonomyLevel'
          | 'maxDailyActions'
          | 'allowedSlackChannels'
          | 'memoryNotes'
          | 'customVariables'
          | 'eventTriggers'
          | 'vmTimeoutMinutes'
          | 'vmRegion'
          | 'vmStartupScript'
        >
      >
    ) => {
      const nowIso = new Date().toISOString();
      let updatedTarget: AgentConfig | null = null;

      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.agentId !== agentId) return ag;
          updatedTarget = {
            ...ag,
            ...patch,
            name: (patch.name ?? ag.name).trim().slice(0, 120) || ag.name,
            description: (patch.description ?? ag.description).slice(0, 4000),
            agentImage: (patch.agentImage ?? ag.agentImage).slice(0, 500),
            isActive: patch.isActive ?? ag.isActive,
            handoffTargetAgentId:
              patch.handoffTargetAgentId !== undefined
                ? patch.handoffTargetAgentId
                : ag.handoffTargetAgentId,
            updatedAt: nowIso,
          };
          return updatedTarget;
        })
      );

      if (!user.isDemo && auth.currentUser?.emailVerified && updatedTarget) {
        const target = updatedTarget as AgentConfig;
        try {
          await ensureAgentInFirestore(agentId);
          await updateDoc(doc(db, 'agents', agentId), {
            name: target.name,
            description: target.description,
            agentImage: target.agentImage,
            isActive: target.isActive,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${agentId}`);
        }
      }

      addToast({
        title: t.toasts.agentSavedTitle,
        description: t.toasts.agentSavedDesc,
        type: 'success',
      });
    },
    [user.isDemo, ensureAgentInFirestore, t, addToast]
  );

  const deleteAgent = useCallback(
    async (agentId: string) => {
      setAgents((prev) => prev.filter((ag) => ag.agentId !== agentId));
      persistedAgentIdsRef.current.delete(agentId);
      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          const snap = await getDoc(doc(db, 'agents', agentId));
          if (snap.exists()) {
            await deleteDoc(doc(db, 'agents', agentId));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `agents/${agentId}`);
        }
      }
      addToast({
        title: t.toasts.agentDeletedTitle,
        description: t.toasts.agentDeletedDesc,
        type: 'info',
      });
    },
    [user.isDemo, t, addToast]
  );

  const connectToolToAgent = useCallback(
    async (agentId: string, toolSlug: string) => {
      const cleanSlug = toolSlug.toLowerCase().trim();
      let nextTools: string[] = [];
      let sessionToSave = '';

      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.agentId !== agentId) return ag;
          const set = new Set(ag.tools);
          if (set.size < 20) set.add(cleanSlug);
          nextTools = Array.from(set);
          sessionToSave =
            ag.composioSessionId || `sess_comp_${Math.random().toString(36).slice(2, 10)}`;
          return {
            ...ag,
            tools: nextTools,
            composioSessionId: sessionToSave,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await ensureAgentInFirestore(agentId);
          await updateDoc(doc(db, 'agents', agentId), {
            tools: nextTools.slice(0, 10),
            composioSessionId: sessionToSave,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${agentId}`);
        }
      }

      addToast({
        title: `${cleanSlug.toUpperCase()}`,
        description: `Session: ${sessionToSave || 'active'}`,
        type: 'success',
      });
    },
    [user.isDemo, ensureAgentInFirestore, addToast]
  );

  const connectAllToolsToAgent = useCallback(
    async (agentId: string) => {
      const allSlugs = TOOL_CATALOG.map((tl) => tl.slug);
      let sessionToSave = '';

      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.agentId !== agentId) return ag;
          sessionToSave =
            ag.composioSessionId || `sess_comp_${Math.random().toString(36).slice(2, 10)}`;
          return {
            ...ag,
            tools: allSlugs,
            composioSessionId: sessionToSave,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await ensureAgentInFirestore(agentId);
          await updateDoc(doc(db, 'agents', agentId), {
            tools: allSlugs.slice(0, 10),
            composioSessionId: sessionToSave,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${agentId}`);
        }
      }

      addToast({
        title:
          locale === 'fr'
            ? '12 outils MCP connectés'
            : locale === 'it'
              ? '12 strumenti MCP connessi'
              : 'All 12 MCP tools connected',
        description: `Session: ${sessionToSave || 'active'}`,
        type: 'success',
      });
    },
    [user.isDemo, ensureAgentInFirestore, addToast, locale]
  );

  const disconnectToolFromAgent = useCallback(
    async (agentId: string, toolSlug: string) => {
      const cleanSlug = toolSlug.toLowerCase().trim();
      let nextTools: string[] = [];
      let sessionToSave = '';

      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.agentId !== agentId) return ag;
          nextTools = ag.tools.filter((tl) => tl !== cleanSlug);
          sessionToSave = ag.composioSessionId;
          return {
            ...ag,
            tools: nextTools,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await ensureAgentInFirestore(agentId);
          await updateDoc(doc(db, 'agents', agentId), {
            tools: nextTools,
            composioSessionId: sessionToSave,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${agentId}`);
        }
      }

      addToast({
        title: `${cleanSlug.toUpperCase()}`,
        description: 'Disconnected',
        type: 'info',
      });
    },
    [user.isDemo, ensureAgentInFirestore, addToast]
  );

  const setVmStatusForAgent = useCallback(
    async (agentId: string, status: VmStatus, trace?: VmActionTrace | null) => {
      const nowIso = new Date().toISOString();
      let sbxId = '';

      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.agentId !== agentId) return ag;
          sbxId = ag.sandboxId || `sbx_e2b_${Math.random().toString(36).slice(2, 10)}`;
          return {
            ...ag,
            sandboxId: sbxId,
            vmStatus: status,
            vmLastActive: status === 'active' ? nowIso : ag.vmLastActive,
            updatedAt: nowIso,
          };
        })
      );

      if (trace !== undefined) {
        setActiveVmTraceByAgent((prev) => ({ ...prev, [agentId]: trace }));
      }

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await ensureAgentInFirestore(agentId);
          await updateDoc(doc(db, 'agents', agentId), {
            sandboxId: sbxId,
            vmStatus: status,
            vmLastActive: nowIso,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${agentId}`);
        }
      }
    },
    [user.isDemo, ensureAgentInFirestore]
  );

  const browseVmUrl = useCallback(
    async (agentId: string, queryOrUrl: string): Promise<VmActionTrace | null> => {
      try {
        const res = await fetch('/api/vm/browse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryOrUrl, locale }),
        });
        const data = await res.json();
        const trace: VmActionTrace = data.trace || buildVmActionTrace(queryOrUrl, locale);
        await setVmStatusForAgent(agentId, 'active', trace);
        return trace;
      } catch {
        const fallbackTrace = buildVmActionTrace(queryOrUrl, locale);
        await setVmStatusForAgent(agentId, 'active', fallbackTrace);
        return fallbackTrace;
      }
    },
    [locale, setVmStatusForAgent]
  );

  const touchVmActivity = useCallback((agentId: string) => {
    const nowIso = new Date().toISOString();
    setAgents((prev) =>
      prev.map((ag) => (ag.agentId === agentId ? { ...ag, vmLastActive: nowIso } : ag))
    );
  }, []);

  const appendChatMessage = useCallback(
    async (agentId: string, message: AgentChatMessage) => {
      setMessagesByAgent((prev) => {
        const current = prev[agentId] || [];
        const exists = current.some((m) => m.messageId === message.messageId);
        const updatedList = exists
          ? current.map((m) => (m.messageId === message.messageId ? message : m))
          : [...current, message];
        const next = {
          ...prev,
          [agentId]: updatedList,
        };
        try {
          localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
        } catch {}
        return next;
      });

      if (auth.currentUser?.emailVerified) {
        const cleanAgentId = sanitizeId(agentId, 'agent');
        const currentUid = sanitizeId(auth.currentUser.uid, 'user');
        const msgId = sanitizeId(message.messageId, 'msg');
        try {
          await ensureAgentInFirestore(cleanAgentId);
          const rawStructuredJson = JSON.stringify(message.structured || {});
          const safePayloadJson =
            rawStructuredJson.length <= 15800
              ? rawStructuredJson
              : JSON.stringify({
                  type: message.structured?.type || message.responseType || 'message',
                  message: (message.structured?.message || '').slice(0, 4000),
                });
          await setDoc(doc(db, 'agents', cleanAgentId, 'messages', msgId), {
            messageId: msgId,
            agentId: cleanAgentId,
            ownerId: currentUid,
            role: message.role === 'user' ? 'user' : 'agent',
            content: (message.content || '').slice(0, 8000),
            responseType: message.responseType || 'message',
            payloadJson: safePayloadJson,
            timeLabel: (message.timeLabel || '').slice(0, 64),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn('Firestore message persistence warning (saved in localStorage):', err);
        }
      }
    },
    [ensureAgentInFirestore]
  );

  const clearAgentChat = useCallback(async (agentId: string) => {
    setMessagesByAgent((prev) => {
      const next = {
        ...prev,
        [agentId]: (prev[agentId] || []).slice(0, 1),
      };
      try {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const createOrUpdateRoutine = useCallback(
    async (agentId: string, draft: RoutineDraft): Promise<AgentRoutine> => {
      const nowIso = new Date().toISOString();
      const isEditing = Boolean(draft.routineId);
      const cleanAgentId = sanitizeId(agentId, 'agent');
      const routineId = sanitizeId(
        draft.routineId || `routine_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        'routine'
      );
      const nextRunAt = computeNextRunAt(draft.frequency, draft.time, draft.days);
      const currentUid = sanitizeId(auth.currentUser?.uid || user.uid, 'user');

      const routineRecord: AgentRoutine = {
        routineId,
        agentId: cleanAgentId,
        ownerId: currentUid,
        name: draft.name.trim().slice(0, 160) || 'Automated Routine',
        goal: draft.goal.trim().slice(0, 1000),
        instructions: draft.instructions.trim().slice(0, 4000),
        frequency: draft.frequency,
        time: draft.time.slice(0, 32),
        timezone: (draft.timezone || 'UTC').slice(0, 64),
        days: (draft.days || []).slice(0, 7),
        tools: (draft.tools || []).slice(0, 10),
        targetChannel: (draft.targetChannel || '#new-channel').slice(0, 120),
        isActive: true,
        nextRunAt,
        lastRunAt: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setRoutinesByAgent((prev) => {
        const list = prev[agentId] || [];
        const exists = list.some((r) => r.routineId === routineId);
        const updatedList = exists
          ? list.map((r) => (r.routineId === routineId ? { ...routineRecord, createdAt: r.createdAt } : r))
          : [routineRecord, ...list];
        return { ...prev, [agentId]: updatedList };
      });

      setEditingRoutineByAgent((prev) => ({ ...prev, [agentId]: null }));

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        const routineRef = doc(db, 'agents', cleanAgentId, 'routines', routineId);
        try {
          await ensureAgentInFirestore(cleanAgentId);
          const rSnap = await getDoc(routineRef);
          if (rSnap.exists()) {
            await updateDoc(routineRef, {
              name: routineRecord.name,
              goal: routineRecord.goal,
              instructions: routineRecord.instructions,
              frequency: routineRecord.frequency,
              time: routineRecord.time,
              timezone: routineRecord.timezone,
              days: routineRecord.days,
              tools: routineRecord.tools,
              targetChannel: routineRecord.targetChannel,
              isActive: routineRecord.isActive,
              nextRunAt: routineRecord.nextRunAt,
              lastRunAt: routineRecord.lastRunAt,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(routineRef, {
              ...routineRecord,
              ownerId: sanitizeId(auth.currentUser.uid, 'user'),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(
            err,
            isEditing ? OperationType.UPDATE : OperationType.CREATE,
            `agents/${cleanAgentId}/routines/${routineId}`
          );
        }
      }

      addToast({
        title: isEditing ? t.toasts.routineUpdatedTitle : t.toasts.routineCreatedTitle,
        description: `"${routineRecord.name}" (${routineRecord.frequency} · ${routineRecord.time})`,
        type: 'success',
      });

      return routineRecord;
    },
    [user, ensureAgentInFirestore, t, addToast]
  );

  const toggleRoutineActive = useCallback(
    async (agentId: string, routineId: string, nextActive: boolean) => {
      let targetNextRun = '';
      let targetLastRun = '';
      let targetRoutine: AgentRoutine | null = null;

      setRoutinesByAgent((prev) => {
        const list = (prev[agentId] || []).map((r) => {
          if (r.routineId !== routineId) return r;
          targetNextRun = nextActive ? computeNextRunAt(r.frequency, r.time, r.days) : r.nextRunAt;
          targetLastRun = r.lastRunAt;
          const updated = {
            ...r,
            isActive: nextActive,
            nextRunAt: targetNextRun,
            updatedAt: new Date().toISOString(),
          };
          targetRoutine = updated;
          return updated;
        });
        return { ...prev, [agentId]: list };
      });

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        const cleanAgentId = sanitizeId(agentId, 'agent');
        const cleanRoutineId = sanitizeId(routineId, 'routine');
        const routineRef = doc(db, 'agents', cleanAgentId, 'routines', cleanRoutineId);
        try {
          await ensureAgentInFirestore(cleanAgentId);
          const rSnap = await getDoc(routineRef);
          if (rSnap.exists()) {
            await updateDoc(routineRef, {
              isActive: nextActive,
              nextRunAt: targetNextRun,
              lastRunAt: targetLastRun,
              updatedAt: serverTimestamp(),
            });
          } else if (targetRoutine) {
            const rt = targetRoutine as AgentRoutine;
            await setDoc(routineRef, {
              routineId: cleanRoutineId,
              agentId: cleanAgentId,
              ownerId: sanitizeId(auth.currentUser.uid, 'user'),
              name: rt.name.slice(0, 160),
              goal: rt.goal.slice(0, 1000),
              instructions: rt.instructions.slice(0, 4000),
              frequency: rt.frequency,
              time: rt.time.slice(0, 32),
              timezone: rt.timezone.slice(0, 64),
              days: rt.days.slice(0, 7),
              tools: rt.tools.slice(0, 10),
              targetChannel: rt.targetChannel.slice(0, 120),
              isActive: nextActive,
              nextRunAt: targetNextRun.slice(0, 64),
              lastRunAt: targetLastRun.slice(0, 64),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${cleanAgentId}/routines/${cleanRoutineId}`);
        }
      }

      addToast({
        title: nextActive ? t.toasts.routineActiveTitle : t.toasts.routinePausedTitle,
        type: 'info',
      });
    },
    [user.isDemo, ensureAgentInFirestore, t, addToast]
  );

  const deleteRoutine = useCallback(
    async (agentId: string, routineId: string) => {
      setRoutinesByAgent((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] || []).filter((r) => r.routineId !== routineId),
      }));

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        const cleanAgentId = sanitizeId(agentId, 'agent');
        const cleanRoutineId = sanitizeId(routineId, 'routine');
        try {
          const rSnap = await getDoc(doc(db, 'agents', cleanAgentId, 'routines', cleanRoutineId));
          if (rSnap.exists()) {
            await deleteDoc(doc(db, 'agents', cleanAgentId, 'routines', cleanRoutineId));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `agents/${cleanAgentId}/routines/${cleanRoutineId}`);
        }
      }

      addToast({
        title: t.toasts.routineDeletedTitle,
        type: 'info',
      });
    },
    [user.isDemo, t, addToast]
  );

  const startEditingRoutine = useCallback((agentId: string, routine: AgentRoutine | null) => {
    setEditingRoutineByAgent((prev) => ({ ...prev, [agentId]: routine }));
  }, []);

  const runMultiAgentWorkflow = useCallback(
    async (
      sourceAgentId: string,
      targetAgentId: string,
      topicPrompt?: string
    ): Promise<RoutineExecution | null> => {
      const sourceAgent = agents.find((a) => a.agentId === sourceAgentId);
      const targetAgent = agents.find((a) => a.agentId === targetAgentId);
      if (!sourceAgent || !targetAgent) return null;

      try {
        const res = await fetch('/api/workflows/chain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceAgent,
            targetAgent,
            topicPrompt,
            locale,
            sourceDocs: knowledgeByAgent[sourceAgentId] || [],
            targetDocs: knowledgeByAgent[targetAgentId] || [],
            slackWebhookUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.execution) {
          throw new Error(data.error || 'Workflow error');
        }

        const wfExec: RoutineExecution = data.execution;
        const srcExec: RoutineExecution = {
          ...wfExec,
          executionId: sanitizeId(`exec_wf_src_${Date.now()}`, 'exec'),
          agentId: sourceAgentId,
          ownerId: sourceAgent.ownerId,
          summary: data.stage1Output || wfExec.summary,
        };

        setExecutionsByAgent((prev) => ({
          ...prev,
          [sourceAgentId]: [srcExec, ...filterThreeDayHistory(prev[sourceAgentId] || [])],
          [targetAgentId]: [wfExec, ...filterThreeDayHistory(prev[targetAgentId] || [])],
        }));

        const srcChat: AgentChatMessage = {
          messageId: sanitizeId(`msg_wf_src_${Date.now()}`, 'msg'),
          agentId: sourceAgentId,
          ownerId: sanitizeId(auth.currentUser?.uid || sourceAgent.ownerId, 'user'),
          role: 'agent',
          content: `🔗 **Workflow Multi-Agents (Étape 1 → ${targetAgent.name})** :\n\n${data.stage1Output}`,
          responseType: 'message',
          timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
        };
        const tgtChat: AgentChatMessage = {
          messageId: sanitizeId(`msg_wf_tgt_${Date.now() + 1}`, 'msg'),
          agentId: targetAgentId,
          ownerId: sanitizeId(auth.currentUser?.uid || targetAgent.ownerId, 'user'),
          role: 'agent',
          content: `🔗 **Workflow Multi-Agents (Reçu de ${sourceAgent.name})** :\n\n${data.stage2Output}`,
          responseType: 'message',
          timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
        };

        await appendChatMessage(sourceAgentId, srcChat);
        await appendChatMessage(targetAgentId, tgtChat);

        addToast({
          title:
            locale === 'fr'
              ? `Pipeline Multi-Agents terminé (${sourceAgent.name} → ${targetAgent.name})`
              : `Multi-Agent Pipeline completed (${sourceAgent.name} → ${targetAgent.name})`,
          description: wfExec.summary.slice(0, 120),
          type: 'success',
        });
        return wfExec;
      } catch (err) {
        console.error('Multi-agent workflow error:', err);
        addToast({
          title:
            locale === 'fr'
              ? 'Échec du pipeline multi-agents'
              : 'Multi-agent pipeline failed',
          type: 'error',
        });
        return null;
      }
    },
    [agents, locale, knowledgeByAgent, slackWebhookUrl, appendChatMessage, addToast]
  );

  const triggerIncomingWebhook = useCallback(
    async (
      agentId: string,
      eventType: string,
      payload: Record<string, unknown>
    ): Promise<RoutineExecution | null> => {
      const agent = agents.find((a) => a.agentId === agentId);
      if (!agent) return null;

      try {
        const res = await fetch(`/api/webhooks/agent/${encodeURIComponent(agentId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            payload,
            agent,
            knowledgeDocs: knowledgeByAgent[agentId] || [],
            locale,
            slackWebhookUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.execution) {
          throw new Error(data.error || 'Webhook trigger error');
        }

        const execution: RoutineExecution = data.execution;
        setExecutionsByAgent((prev) => ({
          ...prev,
          [agentId]: [execution, ...filterThreeDayHistory(prev[agentId] || [])],
        }));

        const chatMsg: AgentChatMessage = {
          messageId: sanitizeId(`msg_wh_${Date.now()}`, 'msg'),
          agentId,
          ownerId: sanitizeId(auth.currentUser?.uid || agent.ownerId, 'user'),
          role: 'agent',
          content: data.chatNotification,
          responseType: 'message',
          timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
        };
        await appendChatMessage(agentId, chatMsg);

        addToast({
          title:
            locale === 'fr'
              ? `Webhook entrant traité (${eventType})`
              : `Incoming Webhook processed (${eventType})`,
          description: execution.summary.slice(0, 120),
          type: 'success',
        });

        return execution;
      } catch (err) {
        console.error('Webhook simulation error:', err);
        addToast({
          title:
            locale === 'fr'
              ? 'Erreur lors du déclenchement Webhook'
              : 'Webhook trigger error',
          type: 'error',
        });
        return null;
      }
    },
    [agents, knowledgeByAgent, locale, slackWebhookUrl, appendChatMessage, addToast]
  );

  const runRoutineNow = useCallback(
    async (
      agentId: string,
      routineId: string,
      triggerType: 'manual' | 'scheduled' = 'manual'
    ): Promise<RoutineExecution | null> => {
      const agent = agents.find((a) => a.agentId === agentId);
      const routine = (routinesByAgent[agentId] || []).find((r) => r.routineId === routineId);
      if (!agent || !routine) return null;

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const activeToken = getAccessToken() || workspaceToken;
        if (activeToken) {
          headers.Authorization = `Bearer ${activeToken}`;
        }

        const res = await fetch('/api/inngest/run', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            routine,
            agent,
            triggerType,
            locale,
            slackWebhookUrl,
            knowledgeDocs: knowledgeByAgent[agentId] || [],
            githubRepo,
            githubToken,
          }),
        });
        const data = await res.json();
        const execution: RoutineExecution = data.execution;

        setExecutionsByAgent((prev) => ({
          ...prev,
          [agentId]: [execution, ...filterThreeDayHistory(prev[agentId] || [])],
        }));

        setRoutinesByAgent((prev) => ({
          ...prev,
          [agentId]: (prev[agentId] || []).map((r) =>
            r.routineId === routineId
              ? {
                  ...r,
                  lastRunAt: data.lastRunAt,
                  nextRunAt: data.nextRunAt,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));

        const chatMsg: AgentChatMessage = {
          messageId: sanitizeId(`msg_exec_${Date.now()}`, 'msg'),
          agentId,
          ownerId: sanitizeId(auth.currentUser?.uid || agent.ownerId, 'user'),
          role: 'agent',
          content: data.chatNotification,
          responseType: 'message',
          timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
        };
        await appendChatMessage(agentId, chatMsg);

        // If this agent or routine has a handoffTargetAgentId configured, automatically chain to Agent B
        const targetHandoffId = routine.handoffTargetAgentId || agent.handoffTargetAgentId;
        if (targetHandoffId && targetHandoffId !== agentId) {
          await runMultiAgentWorkflow(agentId, targetHandoffId, execution.summary);
        }

        if (!user.isDemo && auth.currentUser?.emailVerified) {
          const cleanAgentId = sanitizeId(agentId, 'agent');
          const currentUid = sanitizeId(auth.currentUser.uid, 'user');
          const execId = sanitizeId(execution.executionId, 'exec');
          try {
            await ensureAgentInFirestore(cleanAgentId);
            await setDoc(doc(db, 'agents', cleanAgentId, 'executions', execId), {
              executionId: execId,
              routineId: sanitizeId(routine.routineId, 'routine'),
              routineName: routine.name.slice(0, 160),
              agentId: cleanAgentId,
              ownerId: currentUid,
              status: execution.status,
              triggerType: execution.triggerType,
              summary: execution.summary.slice(0, 4000),
              stepsLog: JSON.stringify(execution.stepsLog).slice(0, 8000),
              startedAt: execution.startedAt.slice(0, 64),
              completedAt: execution.completedAt.slice(0, 64),
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `agents/${cleanAgentId}/executions/${execId}`);
          }
        }

        addToast({
          title: t.toasts.routineCompletedTitle,
          description: `"${routine.name}" (${triggerType === 'scheduled' ? 'Auto-Scheduler' : 'Manual'})`,
          type: 'success',
        });

        return execution;
      } catch (error) {
        console.error('Failed to run routine:', error);
        addToast({
          title: t.toasts.routineFailedTitle,
          type: 'error',
        });
        return null;
      }
    },
    [
      agents,
      routinesByAgent,
      user.isDemo,
      locale,
      t,
      workspaceToken,
      slackWebhookUrl,
      knowledgeByAgent,
      githubRepo,
      githubToken,
      runMultiAgentWorkflow,
      ensureAgentInFirestore,
      appendChatMessage,
      addToast,
    ]
  );

  const scheduleRoutineInSeconds = useCallback(
    (agentId: string, routineId: string, secondsFromNow: number) => {
      const targetIso = new Date(Date.now() + secondsFromNow * 1000).toISOString();
      setRoutinesByAgent((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] || []).map((r) =>
          r.routineId === routineId
            ? {
                ...r,
                isActive: true,
                nextRunAt: targetIso,
                lastRunAt: '',
                updatedAt: new Date().toISOString(),
              }
            : r
        ),
      }));
      addToast({
        title:
          locale === 'fr'
            ? `Exécution auto programmée dans ${secondsFromNow}s`
            : locale === 'it'
              ? `Esecuzione auto programmata tra ${secondsFromNow}s`
              : `Auto-run scheduled in ${secondsFromNow}s`,
        description:
          locale === 'fr'
            ? 'Le planificateur automatique va déclencher cette routine à échéance.'
            : locale === 'it'
              ? 'Lo scheduler automatico avvierà questa routine alla scadenza.'
              : 'The Auto-Scheduler will trigger this routine automatically when due.',
        type: 'info',
      });
    },
    [addToast, locale]
  );

  // Real-time Auto-Scheduler: checks every 5 seconds for any active routine whose nextRunAt <= now
  useEffect(() => {
    if (!autoSchedulerEnabled || !isAuthenticated || !firestoreReady) return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      setLastSchedulerTick(
        new Date(nowMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      for (const ag of agents) {
        if (!ag.isActive) continue;
        const list = routinesByAgent[ag.agentId] || [];
        for (const rt of list) {
          if (isRoutineDue(rt, nowMs)) {
            runRoutineNow(ag.agentId, rt.routineId, 'scheduled');
            return;
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoSchedulerEnabled, isAuthenticated, firestoreReady, agents, routinesByAgent, runRoutineNow]);

  const runHourlyCronCheck = useCallback(
    async (agentId: string): Promise<number> => {
      const list = (routinesByAgent[agentId] || []).filter((r) => r.isActive);
      if (list.length === 0) {
        addToast({
          title: t.toasts.cronCheckEmptyTitle,
          description: t.toasts.cronCheckEmptyDesc,
          type: 'info',
        });
        return 0;
      }

      await runRoutineNow(agentId, list[0].routineId, 'scheduled');
      return 1;
    },
    [routinesByAgent, runRoutineNow, t, addToast]
  );

  const value = useMemo<OrbitContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      user,
      authReady,
      isAuthenticated,
      agents,
      routinesByAgent,
      executionsByAgent,
      messagesByAgent,
      knowledgeByAgent,
      editingRoutineByAgent,
      activeVmTraceByAgent,
      isMarketplaceOpen,
      marketplaceTargetAgentId,
      activeVmModalAgentId,
      toasts,
      signInWithGoogle,
      signInWithCredentials,
      signOutUser,
      addToast,
      dismissToast,
      openMarketplace,
      closeMarketplace,
      openVmModal,
      closeVmModal,
      createAgent,
      updateAgentConfig,
      deleteAgent,
      connectToolToAgent,
      connectAllToolsToAgent,
      disconnectToolFromAgent,
      setVmStatusForAgent,
      browseVmUrl,
      touchVmActivity,
      appendChatMessage,
      clearAgentChat,
      addKnowledgeDocument,
      deleteKnowledgeDocument,
      createOrUpdateRoutine,
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
      setToolCredential,
      freeApiProviders,
      toggleFreeApiProvider,
      toggleFreeApiKey,
      addOrUpdateFreeApiKey,
      deleteFreeApiKey,
      verifyFreeApiKeyHealth,
      autoSchedulerEnabled,
      setAutoSchedulerEnabled,
      lastSchedulerTick,
      scheduleRoutineInSeconds,
    }),
    [
      locale,
      setLocale,
      t,
      user,
      authReady,
      isAuthenticated,
      agents,
      routinesByAgent,
      executionsByAgent,
      messagesByAgent,
      knowledgeByAgent,
      editingRoutineByAgent,
      activeVmTraceByAgent,
      isMarketplaceOpen,
      marketplaceTargetAgentId,
      activeVmModalAgentId,
      toasts,
      signInWithGoogle,
      signInWithCredentials,
      signOutUser,
      addToast,
      dismissToast,
      openMarketplace,
      closeMarketplace,
      openVmModal,
      closeVmModal,
      createAgent,
      updateAgentConfig,
      deleteAgent,
      connectToolToAgent,
      connectAllToolsToAgent,
      disconnectToolFromAgent,
      setVmStatusForAgent,
      browseVmUrl,
      touchVmActivity,
      appendChatMessage,
      clearAgentChat,
      addKnowledgeDocument,
      deleteKnowledgeDocument,
      createOrUpdateRoutine,
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
      setToolCredential,
      freeApiProviders,
      toggleFreeApiProvider,
      toggleFreeApiKey,
      addOrUpdateFreeApiKey,
      deleteFreeApiKey,
      verifyFreeApiKeyHealth,
      autoSchedulerEnabled,
      lastSchedulerTick,
      scheduleRoutineInSeconds,
    ]
  );

  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit(): OrbitContextValue {
  const ctx = useContext(OrbitContext);
  if (!ctx) {
    throw new Error('useOrbit must be used inside an OrbitProvider');
  }
  return ctx;
}


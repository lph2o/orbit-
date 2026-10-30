'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '@/lib/firebase';
import {
  AgentChatMessage,
  AgentConfig,
  AgentRoutine,
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
  filterThreeDayHistory,
  sanitizeId,
  shouldAutoPauseVm,
} from '@/lib/orbit-logic';
import { Dictionary, getDictionary, Locale } from '@/lib/i18n';
import {
  DEMO_AGENTS,
  DEMO_EXECUTIONS,
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
  }) => Promise<AgentConfig>;
  updateAgentConfig: (
    agentId: string,
    patch: Partial<Pick<AgentConfig, 'name' | 'description' | 'agentImage' | 'isActive'>>
  ) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  connectToolToAgent: (agentId: string, toolSlug: string) => Promise<void>;
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
}

const OrbitContext = createContext<OrbitContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  LOCALE: 'orbit_locale_v1',
  AUTH_SESSION: 'orbit_auth_session_v1',
  AGENTS: 'orbit_agents_v1',
  ROUTINES: 'orbit_routines_v1',
  EXECUTIONS: 'orbit_executions_v1',
  MESSAGES: 'orbit_messages_v1',
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

  const t = useMemo(() => getDictionary(locale), [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCALE, nextLocale);
    } catch {}
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

  // Load persisted state from localStorage on client mount
  useEffect(() => {
    testFirestoreConnection();
    try {
      const savedLocale = localStorage.getItem(STORAGE_KEYS.LOCALE);
      if (savedLocale === 'fr' || savedLocale === 'it' || savedLocale === 'en') {
        setLocaleState(savedLocale);
      }

      const savedAgents = localStorage.getItem(STORAGE_KEYS.AGENTS);
      const savedRoutines = localStorage.getItem(STORAGE_KEYS.ROUTINES);
      const savedExecutions = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);

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
        setRoutinesByAgent(JSON.parse(savedRoutines));
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
        const cleanedMsgs: Record<string, AgentChatMessage[]> = {};
        for (const [k, list] of Object.entries(parsedMsgs)) {
          cleanedMsgs[k] = filterThreeDayHistory(list);
        }
        setMessagesByAgent(cleanedMsgs);
      }
    } catch (e) {
      console.warn('Failed to hydrate local Orbit state:', e);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
    } catch {}
  }, [agents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routinesByAgent));
    } catch {}
  }, [routinesByAgent]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executionsByAgent));
    } catch {}
  }, [executionsByAgent]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesByAgent));
    } catch {}
  }, [messagesByAgent]);

  // Listen for Firebase Auth state and load user agents + subcollections from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        try {
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
        return;
      }

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
              return {
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
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            });
            setAgents(loadedAgents);

            const nextRoutines: Record<string, AgentRoutine[]> = {};
            const nextExecutions: Record<string, RoutineExecution[]> = {};
            const nextMessages: Record<string, AgentChatMessage[]> = {};

            for (const ag of loadedAgents) {
              try {
                const rSnap = await getDocs(collection(db, 'agents', ag.agentId, 'routines'));
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

                const eSnap = await getDocs(collection(db, 'agents', ag.agentId, 'executions'));
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

                const mSnap = await getDocs(collection(db, 'agents', ag.agentId, 'messages'));
                if (!mSnap.empty) {
                  nextMessages[ag.agentId] = mSnap.docs.map((docItem) => {
                    const md = docItem.data();
                    let structured = undefined;
                    try {
                      if (md.payloadJson) structured = JSON.parse(md.payloadJson);
                    } catch {}
                    return {
                      messageId: md.messageId,
                      agentId: md.agentId,
                      ownerId: md.ownerId,
                      role: md.role,
                      content: md.content,
                      responseType: md.responseType,
                      structured,
                      timeLabel: md.timeLabel || '',
                      createdAt: new Date().toISOString(),
                    };
                  });
                }
              } catch (subErr) {
                console.warn('Subcollection load warning:', subErr);
              }
            }

            setRoutinesByAgent((prev) => ({ ...prev, ...nextRoutines }));
            setExecutionsByAgent((prev) => ({ ...prev, ...nextExecutions }));
            setMessagesByAgent((prev) => ({ ...prev, ...nextMessages }));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'agents');
        }
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 2-minute E2B Cloud VM Desktop auto-pause timer (Chapter 17)
  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setAgents((prev) => {
        let changed = false;
        const next = prev.map((ag) => {
          if (shouldAutoPauseVm(ag.vmStatus, ag.vmLastActive, nowMs)) {
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
      await signInWithPopup(auth, googleAuthProvider);
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
    }: {
      name: string;
      description: string;
      avatarSeed: string;
    }): Promise<AgentConfig> => {
      const cleanName = name.trim().slice(0, 120) || 'Untitled Agent';
      const cleanDesc = (description || '').trim().slice(0, 4000);
      const agentId = sanitizeId(`agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, 'agent');
      const nowIso = new Date().toISOString();
      const agentImage = buildDiceBearAvatarUrl(avatarSeed || agentId).slice(0, 500);
      const composioSessionId = `sess_comp_${Math.random().toString(36).slice(2, 10)}`;
      const sandboxId = `sbx_e2b_${Math.random().toString(36).slice(2, 10)}`;

      const newAgent: AgentConfig = {
        agentId,
        ownerId: sanitizeId(user.uid, 'user'),
        name: cleanName,
        description: cleanDesc,
        agentImage,
        tools: [],
        composioSessionId,
        sandboxId,
        vmStatus: 'inactive',
        vmLastActive: '',
        isActive: true,
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
      setMessagesByAgent((prev) => ({ ...prev, [agentId]: [welcomeMsg] }));

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        const agentRef = doc(db, 'agents', agentId);
        try {
          await setDoc(agentRef, {
            agentId: newAgent.agentId,
            ownerId: newAgent.ownerId,
            name: newAgent.name,
            description: newAgent.description,
            agentImage: newAgent.agentImage,
            tools: newAgent.tools,
            composioSessionId: newAgent.composioSessionId,
            sandboxId: newAgent.sandboxId,
            vmStatus: newAgent.vmStatus,
            vmLastActive: newAgent.vmLastActive,
            isActive: newAgent.isActive,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
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
      patch: Partial<Pick<AgentConfig, 'name' | 'description' | 'agentImage' | 'isActive'>>
    ) => {
      const nowIso = new Date().toISOString();
      let updatedTarget: AgentConfig | null = null;

      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.agentId !== agentId) return ag;
          updatedTarget = {
            ...ag,
            name: (patch.name ?? ag.name).trim().slice(0, 120) || ag.name,
            description: (patch.description ?? ag.description).slice(0, 4000),
            agentImage: (patch.agentImage ?? ag.agentImage).slice(0, 500),
            isActive: patch.isActive ?? ag.isActive,
            updatedAt: nowIso,
          };
          return updatedTarget;
        })
      );

      if (!user.isDemo && auth.currentUser?.emailVerified && updatedTarget) {
        const target = updatedTarget as AgentConfig;
        try {
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
    [user.isDemo, t, addToast]
  );

  const deleteAgent = useCallback(
    async (agentId: string) => {
      setAgents((prev) => prev.filter((ag) => ag.agentId !== agentId));
      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await deleteDoc(doc(db, 'agents', agentId));
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
          if (set.size < 10) set.add(cleanSlug);
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
        description: `Session: ${sessionToSave || 'active'}`,
        type: 'success',
      });
    },
    [user.isDemo, addToast]
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
    [user.isDemo, addToast]
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
    [user.isDemo]
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
        const current = filterThreeDayHistory(prev[agentId] || []);
        return {
          ...prev,
          [agentId]: [...current, message],
        };
      });

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        const msgId = sanitizeId(message.messageId, 'msg');
        try {
          await setDoc(doc(db, 'agents', agentId, 'messages', msgId), {
            messageId: msgId,
            agentId: sanitizeId(agentId, 'agent'),
            ownerId: sanitizeId(user.uid, 'user'),
            role: message.role,
            content: message.content.slice(0, 8000),
            responseType: message.responseType,
            payloadJson: JSON.stringify(message.structured || {}).slice(0, 16000),
            timeLabel: message.timeLabel.slice(0, 64),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `agents/${agentId}/messages/${msgId}`);
        }
      }
    },
    [user]
  );

  const clearAgentChat = useCallback(async (agentId: string) => {
    setMessagesByAgent((prev) => ({
      ...prev,
      [agentId]: (prev[agentId] || []).slice(0, 1),
    }));
  }, []);

  const createOrUpdateRoutine = useCallback(
    async (agentId: string, draft: RoutineDraft): Promise<AgentRoutine> => {
      const nowIso = new Date().toISOString();
      const isEditing = Boolean(draft.routineId);
      const routineId = sanitizeId(
        draft.routineId || `routine_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        'routine'
      );
      const nextRunAt = computeNextRunAt(draft.frequency, draft.time, draft.days);

      const routineRecord: AgentRoutine = {
        routineId,
        agentId: sanitizeId(agentId, 'agent'),
        ownerId: sanitizeId(user.uid, 'user'),
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
        const routineRef = doc(db, 'agents', agentId, 'routines', routineId);
        try {
          if (isEditing) {
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
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(
            err,
            isEditing ? OperationType.UPDATE : OperationType.CREATE,
            `agents/${agentId}/routines/${routineId}`
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
    [user, t, addToast]
  );

  const toggleRoutineActive = useCallback(
    async (agentId: string, routineId: string, nextActive: boolean) => {
      let targetNextRun = '';
      let targetLastRun = '';
      setRoutinesByAgent((prev) => {
        const list = (prev[agentId] || []).map((r) => {
          if (r.routineId !== routineId) return r;
          targetNextRun = nextActive ? computeNextRunAt(r.frequency, r.time, r.days) : r.nextRunAt;
          targetLastRun = r.lastRunAt;
          return {
            ...r,
            isActive: nextActive,
            nextRunAt: targetNextRun,
            updatedAt: new Date().toISOString(),
          };
        });
        return { ...prev, [agentId]: list };
      });

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await updateDoc(doc(db, 'agents', agentId, 'routines', routineId), {
            isActive: nextActive,
            nextRunAt: targetNextRun,
            lastRunAt: targetLastRun,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `agents/${agentId}/routines/${routineId}`);
        }
      }

      addToast({
        title: nextActive ? t.toasts.routineActiveTitle : t.toasts.routinePausedTitle,
        type: 'info',
      });
    },
    [user.isDemo, t, addToast]
  );

  const deleteRoutine = useCallback(
    async (agentId: string, routineId: string) => {
      setRoutinesByAgent((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] || []).filter((r) => r.routineId !== routineId),
      }));

      if (!user.isDemo && auth.currentUser?.emailVerified) {
        try {
          await deleteDoc(doc(db, 'agents', agentId, 'routines', routineId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `agents/${agentId}/routines/${routineId}`);
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
        const res = await fetch('/api/inngest/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routine, agent, triggerType, locale }),
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
          ownerId: agent.ownerId,
          role: 'agent',
          content: data.chatNotification,
          responseType: 'message',
          timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString(),
        };
        await appendChatMessage(agentId, chatMsg);

        if (!user.isDemo && auth.currentUser?.emailVerified) {
          const execId = sanitizeId(execution.executionId, 'exec');
          try {
            await setDoc(doc(db, 'agents', agentId, 'executions', execId), {
              executionId: execId,
              routineId: sanitizeId(routine.routineId, 'routine'),
              routineName: routine.name.slice(0, 160),
              agentId: sanitizeId(agentId, 'agent'),
              ownerId: sanitizeId(user.uid, 'user'),
              status: execution.status,
              triggerType: execution.triggerType,
              summary: execution.summary.slice(0, 4000),
              stepsLog: JSON.stringify(execution.stepsLog).slice(0, 8000),
              startedAt: execution.startedAt.slice(0, 64),
              completedAt: execution.completedAt.slice(0, 64),
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `agents/${agentId}/executions/${execId}`);
          }
        }

        addToast({
          title: t.toasts.routineCompletedTitle,
          description: `"${routine.name}"`,
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
    [agents, routinesByAgent, user, locale, t, appendChatMessage, addToast]
  );

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
      disconnectToolFromAgent,
      setVmStatusForAgent,
      browseVmUrl,
      touchVmActivity,
      appendChatMessage,
      clearAgentChat,
      createOrUpdateRoutine,
      toggleRoutineActive,
      deleteRoutine,
      startEditingRoutine,
      runRoutineNow,
      runHourlyCronCheck,
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
      disconnectToolFromAgent,
      setVmStatusForAgent,
      browseVmUrl,
      touchVmActivity,
      appendChatMessage,
      clearAgentChat,
      createOrUpdateRoutine,
      toggleRoutineActive,
      deleteRoutine,
      startEditingRoutine,
      runRoutineNow,
      runHourlyCronCheck,
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

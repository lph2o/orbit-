'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  RotateCcw,
  Pause,
  Play,
  Monitor,
  Terminal,
  Folder,
  FolderOpen,
  Globe,
  Search,
  Mail,
  Settings,
  Wrench,
  Code2,
  Palette,
  Film,
  FileText,
  Cpu,
  Star,
  LogOut,
  Trash2,
  HardDrive,
  Home,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  BatteryCharging,
  Bell,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Save,
  Database,
  Send,
  Eraser,
  Pencil,
  Square,
  Circle as CircleIcon,
  Download,
  Eye,
  Activity,
  Loader2,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import {
  buildInitialVmFileSystem,
  buildVmActionTrace,
  executeVmTerminalCommand,
  formatReadableVmUrl,
  getRemainingVmSeconds,
  VmFileEntry,
} from '@/lib/orbit-logic';

export type VmAppId =
  | 'chrome'
  | 'terminal'
  | 'files'
  | 'writer'
  | 'paint'
  | 'viewer'
  | 'mail'
  | 'taskmgr'
  | 'run'
  | 'about';

interface VmWindowInstance {
  id: VmAppId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChromeTab {
  id: string;
  title: string;
  mode: 'newtab' | 'results';
  url: string;
  query: string;
  selectedArticleIdx: number | null;
}

interface VmDesktopProps {
  agentId: string;
  onClose: () => void;
}

export function VmDesktop({ agentId, onClose }: VmDesktopProps) {
  const {
    agents,
    activeVmTraceByAgent,
    setVmStatusForAgent,
    browseVmUrl,
    touchVmActivity,
    knowledgeByAgent,
    addKnowledgeDocument,
    locale,
  } = useOrbit();

  const agent = agents.find((a) => a.agentId === agentId);
  const storedTrace = activeVmTraceByAgent[agentId];
  const rawKnowledgeDocs = knowledgeByAgent[agentId];

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [workspaceIdx, setWorkspaceIdx] = useState<1 | 2>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showNoVncBanner, setShowNoVncBanner] = useState<boolean>(false);
  const [showTraceDrawer, setShowTraceDrawer] = useState<boolean>(false);
  const [appMenuOpen, setAppMenuOpen] = useState<boolean>(false);
  const [hoveredMenuCategory, setHoveredMenuCategory] = useState<string | null>('graphics');
  const [selectedDesktopIcon, setSelectedDesktopIcon] = useState<string | null>(null);
  const [topZ, setTopZ] = useState<number>(30);
  const [osSkin, setOsSkin] = useState<'ubuntu' | 'windows11' | 'xfce'>('ubuntu');
  const [realSystemInfo, setRealSystemInfo] = useState<{
    distro: string;
    kernel: string;
    arch: string;
    hostname: string;
    cpuModel: string;
    cores: number;
    totalMemMb: number;
    freeMemMb: number;
    uptimeSec: number;
    nodeVersion: string;
    pythonVersion: string;
    workdir: string;
  } | null>(null);
  const [isExecutingCmd, setIsExecutingCmd] = useState<boolean>(false);
  const [showCloudStreamConfig, setShowCloudStreamConfig] = useState<boolean>(false);
  const [e2bApiKeyInput, setE2bApiKeyInput] = useState<string>('');
  const [streamUrlInput, setStreamUrlInput] = useState<string>('');
  const [activeRemoteStreamUrl, setActiveRemoteStreamUrl] = useState<string | null>(null);
  const [cloudVerifyBanner, setCloudVerifyBanner] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [isVerifyingCloud, setIsVerifyingCloud] = useState<boolean>(false);

  // Virtual Filesystem State
  const [vmFiles, setVmFiles] = useState<VmFileEntry[]>(() =>
    agent ? buildInitialVmFileSystem(agent, storedTrace, rawKnowledgeDocs || []) : []
  );
  const [currentFolder, setCurrentFolder] = useState<VmFileEntry['folder']>('Home');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Window Manager State
  const [windows, setWindows] = useState<Record<VmAppId, VmWindowInstance>>(() => ({
    chrome: {
      id: 'chrome',
      title: 'New Tab - Google Chrome',
      isOpen: Boolean(storedTrace),
      isMinimized: false,
      isMaximized: false,
      zIndex: 25,
      x: 88,
      y: 18,
      width: 820,
      height: 510,
    },
    terminal: {
      id: 'terminal',
      title: 'Terminal Emulator — user@e2b.local: /home/user',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 20,
      x: 130,
      y: 44,
      width: 720,
      height: 430,
    },
    files: {
      id: 'files',
      title: 'Home — File Manager (Thunar)',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 19,
      x: 110,
      y: 36,
      width: 740,
      height: 450,
    },
    writer: {
      id: 'writer',
      title: 'Executive_Briefing_Notes.md — LibreOffice Writer',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 18,
      x: 150,
      y: 38,
      width: 700,
      height: 450,
    },
    paint: {
      id: 'paint',
      title: 'XPaint / LibreOffice Draw — E2B Graphics Studio',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 17,
      x: 140,
      y: 32,
      width: 710,
      height: 460,
    },
    viewer: {
      id: 'viewer',
      title: 'xpdf / Ristretto Viewer',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 16,
      x: 170,
      y: 48,
      width: 660,
      height: 430,
    },
    mail: {
      id: 'mail',
      title: 'Mail Reader — Synchronized Agent Inbox',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 15,
      x: 135,
      y: 40,
      width: 720,
      height: 440,
    },
    taskmgr: {
      id: 'taskmgr',
      title: 'Task Manager — e2b.local',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 14,
      x: 200,
      y: 65,
      width: 600,
      height: 380,
    },
    run: {
      id: 'run',
      title: 'Application Finder / Run Program...',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 28,
      x: 260,
      y: 110,
      width: 480,
      height: 290,
    },
    about: {
      id: 'about',
      title: 'About Xfce & E2B Cloud VM Sandbox',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 29,
      x: 270,
      y: 100,
      width: 460,
      height: 310,
    },
  }));

  // Google Chrome Multi-Tab State
  const [chromeTabs, setChromeTabs] = useState<ChromeTab[]>(() => {
    if (storedTrace) {
      return [
        {
          id: 'tab_1',
          title: storedTrace.title.slice(0, 26),
          mode: 'results',
          url: formatReadableVmUrl(storedTrace.url),
          query: storedTrace.query,
          selectedArticleIdx: null,
        },
        {
          id: 'tab_new',
          title: 'New Tab',
          mode: 'newtab',
          url: '',
          query: '',
          selectedArticleIdx: null,
        },
      ];
    }
    return [
      {
        id: 'tab_1',
        title: 'New Tab',
        mode: 'newtab',
        url: '',
        query: '',
        selectedArticleIdx: null,
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>('tab_1');
  const [addressBarInput, setAddressBarInput] = useState<string>(
    storedTrace ? formatReadableVmUrl(storedTrace.url) : ''
  );
  const [googleSearchInput, setGoogleSearchInput] = useState<string>('');
  const [isBrowsing, setIsBrowsing] = useState<boolean>(false);

  // Terminal Emulator State
  const [terminalCwd, setTerminalCwd] = useState<string>('/home/user');
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [terminalHistory, setTerminalHistory] = useState<
    { id: string; prompt: string; command: string; output: string[] }[]
  >(() => [
    {
      id: 'init_1',
      prompt: 'user@e2b.local:/home/user$',
      command: 'agent-status',
      output: agent
        ? executeVmTerminalCommand('agent-status', '/home/user', [], agent, storedTrace)
            .outputLines
        : [],
    },
  ]);

  // LibreOffice Writer / Text Editor State
  const [editorFileName, setEditorFileName] = useState<string>('Executive_Briefing_Notes.md');
  const [editorContent, setEditorContent] = useState<string>(() => {
    const initialDoc = vmFiles.find((f) => f.name === 'Executive_Briefing_Notes.md');
    return initialDoc?.content || `# Notes de l'Agent\n\nSaisissez votre compte-rendu ici...`;
  });
  const [editorStatusMsg, setEditorStatusMsg] = useState<string | null>(null);

  // XPaint Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [paintColor, setPaintColor] = useState<string>('#ff2a1f');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [paintTool, setPaintTool] = useState<'pen' | 'rect' | 'circle' | 'eraser'>('pen');
  const [paintStartPos, setPaintStartPos] = useState<{ x: number; y: number } | null>(null);
  const [paintSavedBanner, setPaintSavedBanner] = useState<string | null>(null);

  // Mail Reader State
  const [selectedMailIdx, setSelectedMailIdx] = useState<number>(0);
  const [mailReplyText, setMailReplyText] = useState<string>('');
  const [mailSentNotice, setMailSentNotice] = useState<string | null>(null);

  // Run Program State
  const [runQuery, setRunQuery] = useState<string>('');

  // Window Dragging State
  const [draggingWin, setDraggingWin] = useState<{
    id: VmAppId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Connect to real Linux kernel & sync /tmp/orbit-vm/<agentId> files on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/vm/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'info', agentId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        if (data.systemInfo) {
          setRealSystemInfo(data.systemInfo);
          setTerminalCwd(data.systemInfo.workdir || '/tmp/orbit-vm');
          setTerminalHistory((prev) => [
            {
              id: 'kernel_boot',
              prompt: `user@ubuntu-linux:${data.systemInfo.workdir}$`,
              command: 'uname -a && python3 --version',
              output: [
                `[Noyau Linux Réel Connecté] ${data.systemInfo.distro} — ${data.systemInfo.kernel} (${data.systemInfo.arch})`,
                `CPU: ${data.systemInfo.cpuModel} (${data.systemInfo.cores} vCPU) · RAM: ${data.systemInfo.freeMemMb} MB libre / ${data.systemInfo.totalMemMb} MB`,
                `Runtimes: ${data.systemInfo.pythonVersion} · Node ${data.systemInfo.nodeVersion} · Bash /bin/bash`,
                `Répertoire réel monté: ${data.systemInfo.workdir}`,
              ],
            },
            ...prev,
          ]);
        }
        if (Array.isArray(data.files) && data.files.length > 0) {
          setVmFiles((prev) => {
            const realEntries: VmFileEntry[] = data.files.map(
              (rf: {
                name: string;
                path: string;
                sizeLabel: string;
                updatedAt: string;
                content: string;
              }) => ({
                id: `real_${rf.name}`,
                name: rf.name,
                folder: 'Home',
                path: rf.path,
                kind: rf.name.endsWith('.py') || rf.name.endsWith('.sh') ? 'code' : 'markdown',
                sizeLabel: rf.sizeLabel,
                updatedAt: rf.updatedAt,
                content: rf.content,
              })
            );
            const filteredPrev = prev.filter(
              (p) => !realEntries.some((r) => r.name === p.name)
            );
            return [...realEntries, ...filteredPrev];
          });
        }
      })
      .catch(() => {
        // Ignore network errors
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const agentToolsKey = agent ? agent.tools.join(',') : '';
  const traceUrlKey = storedTrace?.url || '';
  const knowledgeDocsCount = rawKnowledgeDocs ? rawKnowledgeDocs.length : 0;

  // Sync filesystem when agent trace or RAG docs update (using primitive dependencies only)
  useEffect(() => {
    if (!agent) return;
    queueMicrotask(() => {
      setVmFiles((prev) => {
        const freshBase = buildInitialVmFileSystem(
          agent,
          storedTrace,
          rawKnowledgeDocs || []
        );
        const customFiles = prev.filter(
          (f) => !freshBase.some((b) => b.id === f.id || b.name === f.name)
        );
        return [...freshBase, ...customFiles];
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.agentId, agent?.name, agentToolsKey, traceUrlKey, knowledgeDocsCount]);

  // Initialize XPaint canvas with an architecture diagram template when first opened
  useEffect(() => {
    if (!windows.paint.isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.dataset.initialized === 'true') return;
    canvas.dataset.initialized = 'true';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw sample E2B Agent Flow nodes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(40, 60, 150, 64);
    ctx.strokeRect(40, 60, 150, 64);

    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(250, 60, 165, 64);
    ctx.strokeRect(250, 60, 165, 64);

    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(475, 60, 150, 64);
    ctx.strokeRect(475, 60, 150, 64);

    // Arrows
    ctx.beginPath();
    ctx.moveTo(190, 92);
    ctx.lineTo(250, 92);
    ctx.moveTo(415, 92);
    ctx.lineTo(475, 92);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Orbit Agent Core', 62, 88);
    ctx.font = '11px monospace';
    ctx.fillText('Gemini 3.1 + RAG', 62, 108);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('E2B Cloud VM :0', 278, 88);
    ctx.font = '11px monospace';
    ctx.fillText('Chrome + Xfce OS', 278, 108);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('12 MCP Connectors', 494, 88);
    ctx.font = '11px monospace';
    ctx.fillText('Slack / Gmail / Git', 494, 108);
  }, [windows.paint.isOpen]);

  useEffect(() => {
    if (!draggingWin) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - draggingWin.startX;
      const dy = e.clientY - draggingWin.startY;
      setWindows((prev) => ({
        ...prev,
        [draggingWin.id]: {
          ...prev[draggingWin.id],
          x: Math.max(8, Math.min(520, draggingWin.origX + dx)),
          y: Math.max(6, Math.min(340, draggingWin.origY + dy)),
        },
      }));
    };
    const handleMouseUp = () => setDraggingWin(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingWin]);

  if (!agent) return null;

  const trace = storedTrace || buildVmActionTrace('Intelligence Artificielle', locale);
  const remainingSec = getRemainingVmSeconds(
    agent.vmStatus,
    agent.vmLastActive,
    nowMs,
    agent.vmTimeoutMinutes
  );

  // Format Xfce top panel clock (e.g. "Wed 23 Sep, 02:59")
  const formattedClock = new Date(nowMs).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const bringToFront = (id: VmAppId) => {
    setTopZ((prevZ) => {
      const nextZ = prevZ + 1;
      setWindows((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          zIndex: nextZ,
        },
      }));
      return nextZ;
    });
  };

  const launchApp = (id: VmAppId, customTitle?: string) => {
    touchVmActivity(agent.agentId);
    setAppMenuOpen(false);
    setTopZ((prevZ) => {
      const nextZ = prevZ + 1;
      setWindows((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          title: customTitle || prev[id].title,
          isOpen: true,
          isMinimized: false,
          zIndex: nextZ,
        },
      }));
      return nextZ;
    });
  };

  const closeApp = (id: VmAppId) => {
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
        isMinimized: false,
      },
    }));
  };

  const toggleMinimizeApp = (id: VmAppId) => {
    setWindows((prev) => {
      const win = prev[id];
      const maxOpenZ = Math.max(
        ...Object.values(prev)
          .filter((w) => w.isOpen && !w.isMinimized)
          .map((w) => w.zIndex),
        0
      );
      if (win.isMinimized) {
        return {
          ...prev,
          [id]: { ...win, isMinimized: false, zIndex: maxOpenZ + 1 },
        };
      }
      if (win.zIndex === maxOpenZ) {
        return {
          ...prev,
          [id]: { ...win, isMinimized: true },
        };
      }
      return {
        ...prev,
        [id]: { ...win, zIndex: maxOpenZ + 1 },
      };
    });
  };

  const toggleMaximizeApp = (id: VmAppId) => {
    bringToFront(id);
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMaximized: !prev[id].isMaximized,
      },
    }));
  };

  const showDesktopAll = () => {
    const anyVisible = Object.values(windows).some((w) => w.isOpen && !w.isMinimized);
    setWindows((prev) => {
      const next = { ...prev };
      (Object.keys(next) as VmAppId[]).forEach((k) => {
        if (next[k].isOpen) {
          next[k] = { ...next[k], isMinimized: anyVisible };
        }
      });
      return next;
    });
  };

  // Chrome Tab Helpers
  const activeChromeTab =
    chromeTabs.find((t) => t.id === activeTabId) || chromeTabs[0];

  const openNewChromeTab = () => {
    const newId = `tab_${Date.now()}`;
    const newTab: ChromeTab = {
      id: newId,
      title: 'New Tab',
      mode: 'newtab',
      url: '',
      query: '',
      selectedArticleIdx: null,
    };
    setChromeTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setAddressBarInput('');
    setGoogleSearchInput('');
    setWindows((prev) => ({
      ...prev,
      chrome: { ...prev.chrome, title: 'New Tab - Google Chrome' },
    }));
  };

  const closeChromeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chromeTabs.length <= 1) {
      closeApp('chrome');
      return;
    }
    const filtered = chromeTabs.filter((t) => t.id !== id);
    setChromeTabs(filtered);
    if (activeTabId === id) {
      const nextTab = filtered[filtered.length - 1];
      setActiveTabId(nextTab.id);
      setAddressBarInput(nextTab.url);
    }
  };

  const executeChromeNavigation = async (rawQueryOrUrl: string) => {
    const q = rawQueryOrUrl.trim() || 'Intelligence Artificielle';
    setIsBrowsing(true);
    touchVmActivity(agent.agentId);
    await new Promise((r) => setTimeout(r, 220));
    browseVmUrl(agent.agentId, q);
    const nextTrace = buildVmActionTrace(q, locale);
    const readableUrl = formatReadableVmUrl(nextTrace.url);

    setChromeTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeChromeTab.id
          ? {
              ...tab,
              title: nextTrace.title.slice(0, 24),
              mode: 'results',
              url: readableUrl,
              query: q,
              selectedArticleIdx: null,
            }
          : tab
      )
    );
    setAddressBarInput(readableUrl);
    setWindows((prev) => ({
      ...prev,
      chrome: {
        ...prev.chrome,
        title: `${nextTrace.title.slice(0, 28)} - Google Chrome`,
      },
    }));
    setIsBrowsing(false);
  };

  // File Manager -> Open File in appropriate Desktop App
  const openVmFile = (file: VmFileEntry) => {
    setSelectedFileId(file.id);
    if (file.kind === 'pdf' || file.kind === 'csv' || file.kind === 'image') {
      launchApp('viewer', `${file.name} — ${file.kind === 'image' ? 'Ristretto Image Viewer' : 'xpdf'}`);
    } else {
      setEditorFileName(file.name);
      setEditorContent(file.content);
      launchApp('writer', `${file.name} — LibreOffice Writer`);
    }
  };

  const createNewFileInCurrentFolder = () => {
    const name = `Note_Agent_${vmFiles.length + 1}.md`;
    const newEntry: VmFileEntry = {
      id: `vm_custom_${Date.now()}`,
      name,
      folder: currentFolder === 'Trash' ? 'Documents' : currentFolder,
      path: `/home/user/${currentFolder === 'Home' ? '' : currentFolder + '/'}${name}`,
      kind: 'markdown',
      sizeLabel: '1.1 KB',
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      content: `# ${name}\n\nCréé depuis le gestionnaire de fichiers Thunar sur E2B Cloud VM.\n`,
    };
    setVmFiles((prev) => [newEntry, ...prev]);
    openVmFile(newEntry);
  };

  const moveFileToTrash = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVmFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, folder: 'Trash' } : f))
    );
  };

  // Save Editor Document to VM Filesystem & optionally RAG
  const handleSaveEditorToVm = (indexToRag: boolean) => {
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const kbSize = `${Math.max(1, Number((editorContent.length / 1024).toFixed(1)))} KB`;
    setVmFiles((prev) => {
      const exists = prev.some((f) => f.name === editorFileName);
      if (exists) {
        return prev.map((f) =>
          f.name === editorFileName
            ? {
                ...f,
                content: editorContent,
                updatedAt: nowStr,
                sizeLabel: kbSize,
              }
            : f
        );
      }
      return [
        {
          id: `vm_doc_${Date.now()}`,
          name: editorFileName,
          folder: 'Documents',
          path: `/home/user/Documents/${editorFileName}`,
          kind: 'markdown',
          sizeLabel: kbSize,
          updatedAt: nowStr,
          content: editorContent,
        },
        ...prev,
      ];
    });

    // Also persist the file on the real Linux container filesystem (/tmp/orbit-vm/<agentId>)
    fetch('/api/vm/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'write_file',
        agentId: agent.agentId,
        fileName: editorFileName,
        content: editorContent,
      }),
    }).catch(() => {});

    if (indexToRag) {
      addKnowledgeDocument(agent.agentId, {
        docId: `doc_vm_${Date.now()}`,
        agentId: agent.agentId,
        name: editorFileName,
        fileType: editorFileName.endsWith('.csv') ? 'csv' : 'txt',
        sizeBytes: editorContent.length,
        content: editorContent,
        summary: editorContent.slice(0, 140),
        createdAt: new Date().toISOString(),
      });
      setEditorStatusMsg('Enregistré sur le disque Linux réel & indexé dans la Base RAG !');
    } else {
      setEditorStatusMsg('Enregistré sur le disque Linux réel (/tmp/orbit-vm) !');
    }
    setTimeout(() => setEditorStatusMsg(null), 3000);
  };

  const getPromptPrefix = () => {
    if (osSkin === 'windows11') {
      return `PS C:\\Users\\Admin\\OrbitVM>`;
    }
    if (osSkin === 'ubuntu') {
      return `user@ubuntu-24-04:${terminalCwd}$`;
    }
    return `user@e2b.local:${terminalCwd}$`;
  };

  // Execute command on REAL Linux Kernel (/api/vm/system) with builtin fallback for agent-status/help
  const runTerminalCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;
    if (trimmed === 'clear' || trimmed === 'cls') {
      setTerminalHistory([]);
      return;
    }

    const promptLabel = getPromptPrefix();

    if (trimmed === 'agent-status' || trimmed === 'help') {
      const res = executeVmTerminalCommand(trimmed, terminalCwd, vmFiles, agent, trace);
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: `cmd_${Date.now()}`,
          prompt: promptLabel,
          command: trimmed,
          output: res.outputLines,
        },
      ]);
      return;
    }

    setIsExecutingCmd(true);
    try {
      const response = await fetch('/api/vm/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exec',
          agentId: agent.agentId,
          command: trimmed,
        }),
      });
      const data = await response.json();
      const stdoutLines = (data.stdout || '')
        .split('\n')
        .filter((line: string, idx: number, arr: string[]) => !(idx === arr.length - 1 && line === ''));
      const stderrLines = (data.stderr || '')
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .map((l: string) => `[stderr] ${l}`);

      const combinedOutput =
        stdoutLines.length > 0 || stderrLines.length > 0
          ? [...stdoutLines, ...stderrLines]
          : ['[Commande exécutée sur le noyau Linux avec code 0]'];

      setTerminalHistory((prev) => [
        ...prev,
        {
          id: `cmd_${Date.now()}`,
          prompt: promptLabel,
          command: trimmed,
          output: combinedOutput,
        },
      ]);

      if (data.workdir) {
        setTerminalCwd(data.workdir);
      }

      if (Array.isArray(data.files)) {
        setVmFiles((prev) => {
          const realEntries: VmFileEntry[] = data.files.map(
            (rf: {
              name: string;
              path: string;
              sizeLabel: string;
              updatedAt: string;
              content: string;
            }) => ({
              id: `real_${rf.name}`,
              name: rf.name,
              folder: 'Home',
              path: rf.path,
              kind: rf.name.endsWith('.py') || rf.name.endsWith('.sh') ? 'code' : 'markdown',
              sizeLabel: rf.sizeLabel,
              updatedAt: rf.updatedAt,
              content: rf.content,
            })
          );
          const filteredPrev = prev.filter(
            (p) => !realEntries.some((r) => r.name === p.name)
          );
          return [...realEntries, ...filteredPrev];
        });
      }
    } catch {
      const res = executeVmTerminalCommand(trimmed, terminalCwd, vmFiles, agent, trace);
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: `cmd_${Date.now()}`,
          prompt: promptLabel,
          command: trimmed,
          output: res.outputLines,
        },
      ]);
    } finally {
      setIsExecutingCmd(false);
    }
  };

  // Terminal Submit
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = terminalInput;
    setTerminalInput('');
    void runTerminalCommand(raw);
  };

  // XPaint Canvas Handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setPaintStartPos(pos);

    if (paintTool === 'pen' || paintTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasCoords(e);

    if (paintTool === 'pen' || paintTool === 'eraser') {
      ctx.strokeStyle = paintTool === 'eraser' ? '#ffffff' : paintColor;
      ctx.lineWidth = paintTool === 'eraser' ? brushSize * 3 : brushSize;
      ctx.lineCap = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas || !paintStartPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const endPos = getCanvasCoords(e);

    if (paintTool === 'rect') {
      ctx.strokeStyle = paintColor;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(
        paintStartPos.x,
        paintStartPos.y,
        endPos.x - paintStartPos.x,
        endPos.y - paintStartPos.y
      );
    } else if (paintTool === 'circle') {
      ctx.strokeStyle = paintColor;
      ctx.lineWidth = brushSize;
      const radius = Math.hypot(
        endPos.x - paintStartPos.x,
        endPos.y - paintStartPos.y
      );
      ctx.beginPath();
      ctx.arc(paintStartPos.x, paintStartPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    setPaintStartPos(null);
  };

  const clearPaintCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const savePaintToVm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const fileName = `Architecture_E2B_${vmFiles.filter((f) => f.kind === 'image').length + 1}.png`;
    const newImgFile: VmFileEntry = {
      id: `vm_img_${Date.now()}`,
      name: fileName,
      folder: 'Pictures',
      path: `/home/user/Pictures/${fileName}`,
      kind: 'image',
      sizeLabel: '24.6 KB',
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      content: dataUrl,
    };
    setVmFiles((prev) => [newImgFile, ...prev]);
    setSelectedFileId(newImgFile.id);
    setPaintSavedBanner(`Image enregistrée dans /home/user/Pictures/${fileName}`);
    setTimeout(() => setPaintSavedBanner(null), 3000);
  };

  const openWindowsList = Object.values(windows).filter((w) => w.isOpen);
  const activeViewerFile =
    vmFiles.find((f) => f.id === selectedFileId) ||
    vmFiles.find((f) => f.kind === 'pdf' || f.kind === 'image') ||
    vmFiles[0];

  const inboxEmails = [
    {
      id: 'mail_1',
      from: 'cloud-ops@google.com',
      subject: 'Alerte Déploiement Cloud Run & Quotas API Production',
      time: '08:42',
      tag: 'Priorité Haute',
      body: `Bonjour,\n\nLa révision orbit-prod-0042 de l'agent ${agent.name} est active sur us-central1.\nLatence médiane : 110ms.\nSandbox E2B Cloud VM : Connecté (e2b.local:0).\n\nCordialement,\nGoogle Cloud Operations`,
    },
    {
      id: 'mail_2',
      from: 'direction-produit@entreprise.fr',
      subject: 'Revue Feuille de Route Q4 & Automatisation Multi-Agents',
      time: 'Hier',
      tag: 'Action requise',
      body: `Bonjour à toute l'équipe,\n\nMerci de préparer la synthèse des 12 connecteurs MCP (Slack, Gmail, GitHub, Linear, Notion, ClickUp, YouTube, Reddit, Discord, Outlook, Calendar, Docs) avant la réunion de demain à 14h30.\n\nL'agent ${agent.name} publiera le compte-rendu directement sur #new-channel.`,
    },
    {
      id: 'mail_3',
      from: 'notifications@github.com',
      subject: '[vercel/next.js] PR #48 — Intégration E2B Cloud VM Desktop',
      time: 'Hier',
      tag: 'GitHub PR',
      body: `@alex-dev requested your review on PR #48:\n- Full Xfce Desktop OS interface\n- Interactive Google Chrome, Terminal Emulator, Thunar File Manager, XPaint & LibreOffice Writer\n- 0 security alerts detected.`,
    },
  ];

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-[#282828] shadow-2xl select-none"
      onClick={() => {
        if (appMenuOpen) setAppMenuOpen(false);
      }}
    >
      {/* 1. TOP BAR WITH OS SELECTOR (Ubuntu 24.04 / Windows 11 / Linux XFCE) + REAL KERNEL BADGE + E2B STREAM */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-2.5 py-2 sm:px-4 text-slate-900">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Monitor className="h-4 w-4 text-slate-700" />
          <span className="text-[13px] sm:text-[14px] font-bold tracking-tight text-slate-900">
            VM Desktop
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${
              agent.vmStatus === 'active'
                ? 'bg-[#1a56db] text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {agent.vmStatus === 'active' ? 'Active' : 'Paused'}
          </span>

          {/* Real Linux Kernel Status Badge */}
          <span
            title={
              realSystemInfo
                ? `${realSystemInfo.distro} · ${realSystemInfo.kernel} (${realSystemInfo.arch}) · ${realSystemInfo.pythonVersion}`
                : 'Connecté au noyau Linux du serveur'
            }
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Noyau Réel : {realSystemInfo ? `${realSystemInfo.kernel} (${realSystemInfo.arch})` : 'Linux x86_64'}
          </span>

          {/* OS Environment Switcher: Ubuntu 24.04 / Windows 11 / Linux XFCE */}
          <div
            role="group"
            aria-label="Sélecteur de système d'exploitation"
            className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px] sm:text-[11px] font-semibold"
          >
            <button
              type="button"
              onClick={() => setOsSkin('ubuntu')}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition ${
                osSkin === 'ubuntu'
                  ? 'bg-[#e95420] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ubuntu 24.04
            </button>
            <button
              type="button"
              onClick={() => setOsSkin('windows11')}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition ${
                osSkin === 'windows11'
                  ? 'bg-[#0067c0] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Windows 11
            </button>
            <button
              type="button"
              onClick={() => setOsSkin('xfce')}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition ${
                osSkin === 'xfce'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Linux XFCE (E2B)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowCloudStreamConfig((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition ${
              showCloudStreamConfig || activeRemoteStreamUrl
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>{activeRemoteStreamUrl ? 'Flux Actif' : 'Flux Cloud / E2B'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVmStatusForAgent(agent.agentId, 'active');
              touchVmActivity(agent.agentId);
              setShowNoVncBanner(true);
              setTimeout(() => setShowNoVncBanner(false), 2200);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-700" />
            <span className="hidden sm:inline">Reconnect</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setVmStatusForAgent(
                agent.agentId,
                agent.vmStatus === 'active' ? 'paused' : 'active'
              )
            }
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50"
          >
            {agent.vmStatus === 'active' ? (
              <>
                <Pause className="h-3.5 w-3.5 text-slate-700" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Resume</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-label="Close VM Desktop"
            onClick={onClose}
            className="ml-0.5 rounded-md p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* OPTIONAL E2B / REMOTE VNC STREAM CONFIGURATION BAR */}
      {showCloudStreamConfig && (
        <div
          className="border-b border-indigo-200 bg-indigo-50/90 px-4 py-2.5 text-xs text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">
                Architecture d&apos;exécution VM : Noyau Linux Serveur Réel vs Flux Bureau Cloud Externe
              </p>
              <p className="text-[11px] text-slate-600">
                Par défaut, le Terminal et les fichiers sont reliés en direct au <strong>vrai noyau Linux ({realSystemInfo?.distro || 'Debian/Ubuntu'})</strong> de ce serveur. Vous pouvez aussi connecter une clé API E2B officielle ou une URL noVNC/KasmVNC/RDP Web :
              </p>
            </div>
            {activeRemoteStreamUrl && (
              <button
                type="button"
                onClick={() => {
                  setActiveRemoteStreamUrl(null);
                  setCloudVerifyBanner(null);
                }}
                className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
              >
                Revenir au Bureau Linux intégré
              </button>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="password"
              value={e2bApiKeyInput}
              onChange={(e) => setE2bApiKeyInput(e.target.value)}
              placeholder="Clé API E2B officielle (e2b_...)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            />
            <input
              type="text"
              value={streamUrlInput}
              onChange={(e) => setStreamUrlInput(e.target.value)}
              placeholder="Ou URL Flux VNC / Webtop (https://...:6080/vnc.html)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isVerifyingCloud}
                onClick={async () => {
                  setIsVerifyingCloud(true);
                  setCloudVerifyBanner(null);
                  try {
                    const r = await fetch('/api/vm/system', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'verify_e2b',
                        e2bApiKey: e2bApiKeyInput,
                        streamUrl: streamUrlInput,
                      }),
                    });
                    const d = await r.json();
                    if (!d.ok) {
                      setCloudVerifyBanner({ ok: false, text: d.error || 'Échec de vérification' });
                    } else {
                      setCloudVerifyBanner({ ok: true, text: d.message || 'Connecté !' });
                      if (d.streamUrl) {
                        setActiveRemoteStreamUrl(d.streamUrl);
                      }
                    }
                  } catch {
                    setCloudVerifyBanner({
                      ok: false,
                      text: 'Erreur réseau lors de la vérification Cloud VM.',
                    });
                  } finally {
                    setIsVerifyingCloud(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isVerifyingCloud && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Vérifier & Connecter Flux Cloud
              </button>
              <button
                type="button"
                onClick={() => setShowCloudStreamConfig(false)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
          </div>

          {cloudVerifyBanner && (
            <p
              className={`mt-1.5 text-[11px] font-semibold ${
                cloudVerifyBanner.ok ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {cloudVerifyBanner.ok ? '✓ ' : '⚠️ '}
              {cloudVerifyBanner.text}
            </p>
          )}
        </div>
      )}

      {/* 2. NoVNC ENCRYPTED STATUS BANNER & LEFT 'S' PILL TAB (Matches image_8495c65a.png) */}
      <div className="relative flex flex-1 overflow-hidden bg-[#282828]">
        {/* Left NoVNC 'S' Pill Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTraceDrawer((prev) => !prev);
          }}
          title="Afficher / masquer la trace d'actions de l'agent (NoVNC Control)"
          className="absolute top-2.5 left-0 z-50 flex h-7 w-10 items-center justify-start rounded-r-full border border-l-0 border-slate-300 bg-[#d8e0e8] pl-1.5 shadow-md transition hover:w-12"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0284c7] text-[11px] font-black text-white">
            S
          </span>
        </button>

        {/* Optional NoVNC Top Encrypted Connection Strip */}
        {showNoVncBanner && (
          <div className=" pointer-events-none absolute top-0 right-0 left-0 z-40 flex h-6 items-center justify-between bg-[#787878]/85 px-14 text-[11px] font-medium text-white backdrop-blur-[1px]">
            <span>Connected (encrypted) to e2b.local:0</span>
            <button
              type="button"
              onClick={() => setShowNoVncBanner(false)}
              className="pointer-events-auto text-[10px] text-white/80 hover:text-white"
            >
              Masquer
            </button>
          </div>
        )}

        {/* Left Collapsible Agent Trace & Quick Actions Drawer (Triggered by 'S' button) */}
        {showTraceDrawer && (
          <div
            className="z-40 flex w-72 shrink-0 flex-col border-r border-[#3a3a3a] bg-[#1c1c1c] text-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0284c7] text-[10px] font-black text-white">
                  S
                </span>
                <span className="text-xs font-bold text-white">
                  Trace Agent & Contrôle E2B
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTraceDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                <p className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                  Session Sandbox Active
                </p>
                <p className="mt-1 text-xs font-semibold text-white">{agent.name}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                  {trace.url}
                </p>
              </div>

              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Étapes Computer-Use ({trace.steps.length})
              </p>
              {trace.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ÉTAPE 0{idx + 1}
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-300">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. CENTERED XFCE DESKTOP MONITOR VIEWPORT (Matches 4:3 / 16:10 black E2B screen inside #282828 frame) */}
        <div className="relative mx-auto flex h-full w-full max-w-[1160px] flex-col overflow-hidden border-x border-[#1a1a1a] bg-black shadow-2xl">
          {/* PAUSED OVERLAY IF PAUSED */}
          {agent.vmStatus === 'paused' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs">
              <Monitor className="h-12 w-12 text-amber-400" />
              <p className="mt-3 text-base font-bold text-white">
                VM Desktop en pause ({agent.sandboxId || 'e2b.local:0'})
              </p>
              <p className="mt-1 text-xs text-slate-400">
                L’état des fenêtres Xfce et les cookies Chrome sont préservés en mémoire.
              </p>
              <button
                type="button"
                onClick={() => setVmStatusForAgent(agent.agentId, 'active')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a56db] px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-600"
              >
                <Play className="h-3.5 w-3.5" />
                Reprendre la session VM Desktop
              </button>
            </div>
          )}

          {/* 3A. OS TOP PANEL (Ubuntu GNOME / Windows 11 Bar / XFCE Panel) */}
          <div
            className={`relative z-30 flex h-7 shrink-0 items-center justify-between border-b px-2 text-[12px] text-[#e5e5e5] ${
              osSkin === 'ubuntu'
                ? 'border-[#3d1430] bg-[#1d0917]'
                : osSkin === 'windows11'
                  ? 'border-[#1e3a8a]/60 bg-[#0b192c]'
                  : 'border-[#333333] bg-[#222222]'
            }`}
          >
            {/* Left: Applications / Start Button + Open Window Taskbar Buttons */}
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppMenuOpen((prev) => {
                    const next = !prev;
                    if (next) setHoveredMenuCategory('graphics');
                    return next;
                  });
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-xs px-2 py-0.5 font-medium transition ${
                  appMenuOpen
                    ? 'bg-[#3a3a3a] text-white'
                    : 'text-[#e5e5e5] hover:bg-white/10'
                }`}
              >
                {osSkin === 'ubuntu' ? (
                  <>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e95420] text-[10px] font-black text-white">
                      U
                    </span>
                    <span>Activities · Ubuntu 24.04</span>
                  </>
                ) : osSkin === 'windows11' ? (
                  <>
                    <span className="flex h-4 w-4 items-center justify-center rounded-xs bg-[#0078d4] text-[10px] font-black text-white">
                      ❖
                    </span>
                    <span>Démarrer · Windows 11</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-4 w-4 items-center justify-center rounded-xs bg-[#0284c7] text-[10px] font-black text-white">
                      X
                    </span>
                    <span>Applications</span>
                  </>
                )}
              </button>

              <span className="mx-0.5 text-[#555555]">⋮</span>

              {/* Open Window Buttons on Xfce Top Taskbar (Matches "New Tab - Google Chrome" in image_29684136.png) */}
              {openWindowsList.map((win) => {
                const isFocused =
                  !win.isMinimized &&
                  win.zIndex ===
                    Math.max(
                      ...openWindowsList
                        .filter((w) => !w.isMinimized)
                        .map((w) => w.zIndex),
                      0
                    );
                return (
                  <button
                    key={win.id}
                    type="button"
                    onClick={() => toggleMinimizeApp(win.id)}
                    className={`flex max-w-[200px] shrink-0 items-center gap-1.5 truncate rounded-xs border px-2.5 py-0.5 text-[11px] transition ${
                      isFocused
                        ? 'border-[#0284c7]/60 bg-[#2d4356] font-semibold text-white'
                        : win.isMinimized
                          ? 'border-transparent bg-[#1b1b1b] text-slate-400 hover:bg-[#2c2c2c]'
                          : 'border-[#383838] bg-[#2a2a2a] text-slate-200 hover:bg-[#343434]'
                    }`}
                  >
                    {win.id === 'chrome' && (
                      <Globe className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
                    )}
                    {win.id === 'terminal' && (
                      <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    )}
                    {win.id === 'files' && (
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    )}
                    {win.id === 'paint' && (
                      <Palette className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                    )}
                    {win.id === 'writer' && (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                    )}
                    {win.id === 'mail' && (
                      <Mail className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}
                    {(win.id === 'viewer' ||
                      win.id === 'taskmgr' ||
                      win.id === 'run' ||
                      win.id === 'about') && (
                      <Cpu className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                    )}
                    <span className="truncate">{win.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Workspace Switcher + Tray Icons + Clock + user */}
            <div className="flex shrink-0 items-center gap-2.5 pl-2">
              {/* 2-Workspace Switcher (Matches blue/dark blocks in image_b08c14c0.png) */}
              <div className="flex h-5 items-center gap-0.5 rounded-xs border border-[#3d3d3d] bg-[#181818] p-0.5">
                <button
                  type="button"
                  onClick={() => setWorkspaceIdx(1)}
                  title="Workspace 1"
                  className={`flex h-full w-6 items-center justify-center rounded-[1px] text-[9px] ${
                    workspaceIdx === 1 ? 'bg-[#1d4ed8] text-white' : 'bg-[#2a2a2a] text-slate-400'
                  }`}
                >
                  {openWindowsList.some((w) => w.id === 'chrome') ? '🌐' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceIdx(2)}
                  title="Workspace 2"
                  className={`flex h-full w-6 items-center justify-center rounded-[1px] text-[9px] ${
                    workspaceIdx === 2 ? 'bg-[#1d4ed8] text-white' : 'bg-[#2a2a2a] text-slate-400'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label="Toggle Volume"
                className="text-slate-300 hover:text-white"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-slate-300" />
                )}
              </button>

              <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" />
              <Bell className="h-3.5 w-3.5 text-white" />

              <span className="font-sans text-[11px] font-medium text-[#e5e5e5]">
                {formattedClock}
              </span>

              <button
                type="button"
                onClick={() => launchApp('about')}
                className="text-[11px] font-medium text-[#e5e5e5] hover:text-white"
              >
                user
              </button>
            </div>
          </div>

          {/* 3B. XFCE APPLICATIONS DROPDOWN MENU & SUBMENUS (Matches image_b08c14c0.png) */}
          {appMenuOpen && (
            <div
              className="absolute top-7 left-0 z-50 flex"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Primary Left Menu Column */}
              <div className="w-52 border border-[#141414] bg-[#2b2b2b] py-1 text-[12px] text-[#eaeaea] shadow-2xl">
                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => launchApp('run')}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <Search className="h-3.5 w-3.5 text-slate-300" />
                  <span>Run Program...</span>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => launchApp('terminal')}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Terminal Emulator</span>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => {
                    setCurrentFolder('Home');
                    launchApp('files', 'Home — File Manager (Thunar)');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <Folder className="h-3.5 w-3.5 text-slate-200" />
                  <span>File Manager</span>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => launchApp('mail')}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5 text-amber-400" />
                  <span>Mail Reader</span>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => launchApp('chrome')}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <Globe className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>Web Browser</span>
                </button>

                <div className="my-1 border-t border-[#3d3d3d]" />

                {[
                  { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-300' },
                  { id: 'accessories', label: 'Accessories', icon: Wrench, color: 'text-orange-400' },
                  { id: 'development', label: 'Development', icon: Code2, color: 'text-sky-400' },
                  { id: 'graphics', label: 'Graphics', icon: Palette, color: 'text-pink-400' },
                  { id: 'internet', label: 'Internet', icon: Globe, color: 'text-blue-400' },
                  { id: 'multimedia', label: 'Multimedia', icon: Film, color: 'text-purple-400' },
                  { id: 'office', label: 'Office', icon: FileText, color: 'text-emerald-400' },
                  { id: 'system', label: 'System', icon: Cpu, color: 'text-slate-300' },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = hoveredMenuCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={() => setHoveredMenuCategory(cat.id)}
                      onClick={() => setHoveredMenuCategory(cat.id)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left ${
                        isActive ? 'bg-[#0269a4] text-white' : 'hover:bg-[#0269a4] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : cat.color}`} />
                        <span>{cat.label}</span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  );
                })}

                <div className="my-1 border-t border-[#3d3d3d]" />

                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => launchApp('about')}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span>About Xfce</span>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredMenuCategory(null)}
                  onClick={() => {
                    setAppMenuOpen(false);
                    setVmStatusForAgent(agent.agentId, 'paused');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5 text-orange-400" />
                  <span>Log Out</span>
                </button>
              </div>

              {/* Flyout Submenu (Matches image_b08c14c0.png Graphics submenu!) */}
              {hoveredMenuCategory && (
                <div className="mt-[158px] h-fit w-56 border border-[#141414] bg-[#2b2b2b] py-1 text-[12px] text-[#eaeaea] shadow-2xl">
                  {hoveredMenuCategory === 'graphics' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          launchApp('paint', 'LibreOffice Draw — Architecture Diagram')
                        }
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-400" />
                        <span>LibreOffice Draw</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          launchApp('viewer', 'Ristretto Image Viewer — /home/user/Pictures')
                        }
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-400" />
                        <span>Ristretto Image Viewer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('paint', 'XPaint — E2B Graphics Studio')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Palette className="h-3.5 w-3.5 text-rose-400" />
                        <span>XPaint</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('viewer', 'xpdf — Document & PDF Reader')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <FileText className="h-3.5 w-3.5 text-red-400" />
                        <span>xpdf</span>
                      </button>
                    </>
                  )}

                  {hoveredMenuCategory === 'internet' && (
                    <>
                      <button
                        type="button"
                        onClick={() => launchApp('chrome')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Globe className="h-3.5 w-3.5 text-[#38bdf8]" />
                        <span>Google Chrome</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('mail')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Mail className="h-3.5 w-3.5 text-amber-400" />
                        <span>Mail Reader</span>
                      </button>
                    </>
                  )}

                  {hoveredMenuCategory === 'office' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          launchApp(
                            'writer',
                            'Executive_Briefing_Notes.md — LibreOffice Writer'
                          )
                        }
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <FileText className="h-3.5 w-3.5 text-sky-400" />
                        <span>LibreOffice Writer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          launchApp('paint', 'LibreOffice Draw — Architecture Diagram')
                        }
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Palette className="h-3.5 w-3.5 text-amber-400" />
                        <span>LibreOffice Draw</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('viewer', 'xpdf — PDF Viewer')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <FileText className="h-3.5 w-3.5 text-red-400" />
                        <span>xpdf</span>
                      </button>
                    </>
                  )}

                  {hoveredMenuCategory === 'development' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const pyFile = vmFiles.find(
                            (f) => f.name === 'agent_browser_worker.py'
                          );
                          if (pyFile) openVmFile(pyFile);
                          else launchApp('writer', 'agent_browser_worker.py — Mousepad IDE');
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Mousepad Python IDE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('terminal')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Terminal className="h-3.5 w-3.5 text-sky-400" />
                        <span>Terminal Emulator</span>
                      </button>
                    </>
                  )}

                  {(hoveredMenuCategory === 'settings' ||
                    hoveredMenuCategory === 'accessories' ||
                    hoveredMenuCategory === 'multimedia' ||
                    hoveredMenuCategory === 'system') && (
                    <>
                      <button
                        type="button"
                        onClick={() => launchApp('taskmgr')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Task Manager (htop)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('run')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Search className="h-3.5 w-3.5 text-sky-400" />
                        <span>Application Finder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => launchApp('about')}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[#0269a4] hover:text-white"
                      >
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        <span>System Information</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3C. DESKTOP SURFACE (Ubuntu 24.04 / Windows 11 / Linux XFCE) + REMOTE VNC STREAM */}
          {activeRemoteStreamUrl ? (
            <div className="relative flex-1 bg-black">
              <iframe
                src={activeRemoteStreamUrl}
                title="Remote Cloud VM Stream"
                className="h-full w-full border-0"
              />
            </div>
          ) : (
          <div
            className={`relative flex-1 overflow-hidden ${
              osSkin === 'ubuntu'
                ? 'bg-linear-to-br from-[#2c001e] via-[#5e2750] to-[#e95420]'
                : osSkin === 'windows11'
                  ? 'bg-linear-to-br from-[#071936] via-[#0f3460] to-[#1d4ed8]'
                  : 'bg-black'
            }`}
            onClick={() => setSelectedDesktopIcon(null)}
          >
            {/* Dynamic OS Wallpaper Centerpiece & Real Kernel Telemetry Card */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {osSkin === 'ubuntu' ? (
                <div className="flex flex-col items-center text-center select-none">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 shadow-2xl backdrop-blur-xs">
                    <span className="text-3xl font-black tracking-tight text-white">
                      ubuntu
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-extrabold tracking-tight text-white drop-shadow-sm">
                    Ubuntu 24.04 LTS (Noble Numbat)
                  </p>
                  <p className="mt-1 rounded-full border border-white/20 bg-black/35 px-3.5 py-1 font-mono text-[11px] text-orange-100 backdrop-blur-xs">
                    Noyau actif : {realSystemInfo ? `${realSystemInfo.distro} · ${realSystemInfo.kernel} (${realSystemInfo.arch})` : 'Linux x86_64'} · {realSystemInfo?.pythonVersion || 'Python 3'}
                  </p>
                </div>
              ) : osSkin === 'windows11' ? (
                <div className="flex flex-col items-center text-center select-none">
                  <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-sky-300/30 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
                    <div className="h-8 w-8 rounded-xs bg-[#00a4ef]" />
                    <div className="h-8 w-8 rounded-xs bg-[#00a4ef]" />
                    <div className="h-8 w-8 rounded-xs bg-[#00a4ef]" />
                    <div className="h-8 w-8 rounded-xs bg-[#00a4ef]" />
                  </div>
                  <p className="mt-3 text-lg font-extrabold tracking-tight text-white drop-shadow-sm">
                    Windows 11 Pro · Cloud Workstation (WSL2 Linux Bridge)
                  </p>
                  <p className="mt-1 rounded-full border border-sky-300/25 bg-black/35 px-3.5 py-1 font-mono text-[11px] text-sky-100 backdrop-blur-xs">
                    Sous-système WSL2 actif : {realSystemInfo ? `${realSystemInfo.kernel} (${realSystemInfo.arch})` : 'Linux x86_64'} · {realSystemInfo?.cores || 2} vCPU
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center select-none">
                  <span
                    className="font-mono text-[68px] font-black tracking-[-0.06em] text-[#ff281b]"
                    style={{
                      textShadow: '0 0 28px rgba(255, 40, 27, 0.22)',
                      fontFamily: 'Impact, "Arial Black", sans-serif',
                      transform: 'scaleX(1.35)',
                    }}
                  >
                    E2B
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    {realSystemInfo ? `${realSystemInfo.distro} · ${realSystemInfo.kernel}` : 'Linux XFCE4 Sandbox'}
                  </p>
                </div>
              )}
            </div>

            {/* Left Column Desktop Icons: Trash, File System, Home (Matches image_8495c65a.png) */}
            <div className="relative z-10 flex w-24 flex-col items-center gap-5 pt-4 pl-3">
              {/* Trash */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDesktopIcon('trash');
                  setCurrentFolder('Trash');
                  launchApp('files', 'Trash — File Manager (Thunar)');
                }}
                className={`group flex w-20 flex-col items-center rounded-sm p-1.5 text-center transition ${
                  selectedDesktopIcon === 'trash'
                    ? 'bg-white/20 ring-1 ring-white/40'
                    : 'hover:bg-white/10'
                }`}
              >
                <div className="flex h-10 w-9 flex-col items-center justify-center rounded-t-sm rounded-b-md border border-slate-400 bg-linear-to-b from-slate-200 via-slate-400 to-slate-600 shadow-md">
                  <Trash2 className="h-5 w-5 text-slate-900" />
                </div>
                <span className="mt-1 text-[11px] font-medium text-[#d4d4d4] drop-shadow-xs">
                  Trash
                </span>
              </button>

              {/* File System */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDesktopIcon('filesystem');
                  setCurrentFolder('File System');
                  launchApp('files', 'File System (/) — File Manager');
                }}
                className={`group flex w-20 flex-col items-center rounded-sm p-1.5 text-center transition ${
                  selectedDesktopIcon === 'filesystem'
                    ? 'bg-white/20 ring-1 ring-white/40'
                    : 'hover:bg-white/10'
                }`}
              >
                <div className="flex h-9 w-11 items-center justify-center rounded-md border border-slate-400 bg-linear-to-b from-slate-100 via-slate-300 to-slate-500 shadow-md">
                  <HardDrive className="h-5 w-5 text-slate-800" />
                </div>
                <span className="mt-1 text-[11px] font-medium text-[#d4d4d4] drop-shadow-xs">
                  File System
                </span>
              </button>

              {/* Home */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDesktopIcon('home');
                  setCurrentFolder('Home');
                  launchApp('files', 'Home (/home/user) — File Manager');
                }}
                className={`group flex w-20 flex-col items-center rounded-sm p-1.5 text-center transition ${
                  selectedDesktopIcon === 'home'
                    ? 'bg-white/20 ring-1 ring-white/40'
                    : 'hover:bg-white/10'
                }`}
              >
                <div className="flex h-9 w-11 items-center justify-center rounded-md border border-amber-300/80 bg-linear-to-b from-[#f5d9aa] to-[#dfb474] shadow-md">
                  <Home className="h-5 w-5 text-amber-950/80" />
                </div>
                <span className="mt-1 text-[11px] font-medium text-[#d4d4d4] drop-shadow-xs">
                  Home
                </span>
              </button>
            </div>

            {/* =====================================================================
                WINDOW 1: GOOGLE CHROME (Matches image_29684136.png!)
               ===================================================================== */}
            {windows.chrome.isOpen && !windows.chrome.isMinimized && (
              <div
                onMouseDown={() => bringToFront('chrome')}
                style={
                  windows.chrome.isMaximized
                    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 46px)', zIndex: windows.chrome.zIndex }
                    : {
                        top: windows.chrome.y,
                        left: windows.chrome.x,
                        width: windows.chrome.width,
                        height: windows.chrome.height,
                        zIndex: windows.chrome.zIndex,
                      }
                }
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#8c8c8c] bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
              >
                {/* Chrome Top Tab Bar (#d4d4d4) */}
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('chrome');
                    setDraggingWin({
                      id: 'chrome',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.chrome.x,
                      origY: windows.chrome.y,
                    });
                  }}
                  className="flex h-9 shrink-0 cursor-move items-end justify-between bg-[#cfcfcf] px-2 pt-1.5 select-none"
                >
                  <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
                    <span className="mb-1.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-600">
                      ▾
                    </span>
                    {chromeTabs.map((tab) => {
                      const active = tab.id === activeChromeTab.id;
                      return (
                        <div
                          key={tab.id}
                          onClick={() => {
                            setActiveTabId(tab.id);
                            setAddressBarInput(tab.url);
                          }}
                          className={`group flex h-7 max-w-[195px] min-w-[130px] cursor-pointer items-center justify-between gap-2 rounded-t-lg px-3 text-[11px] font-medium transition ${
                            active
                              ? 'bg-[#f2f2f2] text-slate-900 shadow-2xs'
                              : 'bg-[#dedede] text-slate-600 hover:bg-[#e8e8e8]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                            <span className="truncate">{tab.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => closeChromeTab(tab.id, e)}
                            className="rounded-full p-0.5 text-slate-500 hover:bg-slate-300 hover:text-slate-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={openNewChromeTab}
                      title="Nouvel onglet"
                      className="mb-1 ml-1 rounded-full p-1 text-slate-700 hover:bg-black/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Window Controls (—, +, ✕) */}
                  <div className="mb-1.5 flex items-center gap-2 pr-1 text-slate-700">
                    <button
                      type="button"
                      aria-label="Minimize Chrome"
                      onClick={() => toggleMinimizeApp('chrome')}
                      className="rounded-xs p-0.5 hover:bg-black/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Maximize Chrome"
                      onClick={() => toggleMaximizeApp('chrome')}
                      className="rounded-xs p-0.5 hover:bg-black/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Close Chrome"
                      onClick={() => closeApp('chrome')}
                      className="rounded-xs p-0.5 hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Chrome Navigation & Address Bar (Matches image_29684136.png!) */}
                <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-[#f2f2f2] px-3">
                  <button
                    type="button"
                    onClick={() => {
                      setChromeTabs((prev) =>
                        prev.map((t) =>
                          t.id === activeChromeTab.id
                            ? { ...t, mode: 'newtab', url: '', title: 'New Tab', selectedArticleIdx: null }
                            : t
                        )
                      );
                      setAddressBarInput('');
                    }}
                    title="Retour à l'accueil Google"
                    className="rounded-full p-1 text-slate-600 hover:bg-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeChromeNavigation(addressBarInput || 'Intelligence Artificielle')}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeChromeNavigation(addressBarInput || activeChromeTab.query || 'Intelligence Artificielle')}
                    className="rounded-full p-1 text-slate-600 hover:bg-slate-200"
                  >
                    {isBrowsing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Chrome Omnibox with Blue Focus Ring & "AI Mode" Pill */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeChromeNavigation(addressBarInput);
                    }}
                    className="flex flex-1 items-center gap-2 rounded-full border-2 border-[#1a73e8] bg-white px-3 py-1 shadow-2xs"
                  >
                    <span className="text-xs font-black text-[#4285F4]">G</span>
                    <input
                      type="text"
                      value={addressBarInput}
                      onChange={(e) => setAddressBarInput(e.target.value)}
                      placeholder="Press tab then enter to ask AI Mode"
                      className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8eef7] px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-[#dbe4f3]"
                    >
                      <Sparkles className="h-3 w-3 text-[#1a73e8]" />
                      AI Mode
                    </button>
                  </form>

                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-[11px] font-bold text-slate-700">
                    U
                  </div>
                </div>

                {/* Chrome Viewport Content */}
                <div className="flex-1 overflow-y-auto bg-white">
                  {activeChromeTab.mode === 'newtab' ? (
                    /* GOOGLE NEW TAB PAGE (Matches image_29684136.png side-by-side!) */
                    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-8">
                      {/* Top Right Gmail / Images links */}
                      <div className="absolute top-3 right-5 flex items-center gap-4 text-xs text-slate-700">
                        <button
                          type="button"
                          onClick={() => launchApp('mail')}
                          className="hover:underline"
                        >
                          Gmail
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            launchApp('viewer', 'Ristretto Image Viewer — /home/user/Pictures')
                          }
                          className="hover:underline"
                        >
                          Images
                        </button>
                        <span className="grid grid-cols-3 gap-0.5 p-1 text-slate-500">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <span key={i} className="h-1 w-1 rounded-full bg-slate-600" />
                          ))}
                        </span>
                      </div>

                      {/* Colorful Google Logo */}
                      <div className="mb-6 select-none text-[54px] font-semibold tracking-tight">
                        <span className="text-[#4285F4]">G</span>
                        <span className="text-[#EA4335]">o</span>
                        <span className="text-[#FBBC05]">o</span>
                        <span className="text-[#4285F4]">g</span>
                        <span className="text-[#34A853]">l</span>
                        <span className="text-[#EA4335]">e</span>
                      </div>

                      {/* Search Google or type a URL */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          executeChromeNavigation(googleSearchInput || 'Intelligence Artificielle');
                        }}
                        className="flex w-full max-w-lg items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.1)] transition focus-within:shadow-[0_3px_14px_rgba(0,0,0,0.16)]"
                      >
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={googleSearchInput}
                          onChange={(e) => setGoogleSearchInput(e.target.value)}
                          placeholder="Search Google or type a URL"
                          className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none"
                        />
                        <span className="text-xs text-[#4285F4]">🎤</span>
                        <span className="text-xs text-[#EA4335]">📷</span>
                      </form>

                      {/* Shortcuts Row (Matches Web Store + Add shortcut + Live Agent Shortcuts) */}
                      <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                        <button
                          type="button"
                          onClick={() => executeChromeNavigation('Google News Intelligence Artificielle')}
                          className="group flex flex-col items-center gap-2"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:bg-slate-200">
                            <Globe className="h-5 w-5 text-[#4285F4]" />
                          </div>
                          <span className="text-[11px] font-medium text-slate-700">
                            Web Store
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => executeChromeNavigation('Intelligence Artificielle')}
                          className="group flex flex-col items-center gap-2"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-medium text-slate-700">
                            Google News IA
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            executeChromeNavigation('https://www.tubeguruji.com/courses')
                          }
                          className="group flex flex-col items-center gap-2"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition group-hover:bg-rose-100">
                            <Code2 className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-medium text-slate-700">
                            TubeGuruji
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            executeChromeNavigation('https://news.ycombinator.com')
                          }
                          className="group flex flex-col items-center gap-2"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-slate-800 transition group-hover:bg-slate-300">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-medium text-slate-700">
                            Add shortcut
                          </span>
                        </button>
                      </div>

                      {/* Bottom Right Customize Chrome Pill */}
                      <button
                        type="button"
                        onClick={() => executeChromeNavigation('Intelligence Artificielle')}
                        className="absolute right-4 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-[#1a73e8] shadow-xs hover:bg-blue-50"
                      >
                        <Pencil className="h-3 w-3" />
                        Customize Chrome
                      </button>
                    </div>
                  ) : (
                    /* LIVE EXTRACTED RESULTS VIEW INSIDE CHROME */
                    <div className="p-5">
                      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <p className="text-[11px] font-semibold text-[#1a73e8]">
                            {trace.url}
                          </p>
                          <h3 className="text-base font-bold text-slate-900">
                            {trace.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setChromeTabs((prev) =>
                              prev.map((t) =>
                                t.id === activeChromeTab.id
                                  ? { ...t, mode: 'newtab', url: '', title: 'New Tab', selectedArticleIdx: null }
                                  : t
                              )
                            );
                            setAddressBarInput('');
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Page d&apos;accueil Google
                        </button>
                      </div>

                      {activeChromeTab.selectedArticleIdx !== null &&
                      trace.extractedItems[activeChromeTab.selectedArticleIdx] ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <button
                            type="button"
                            onClick={() =>
                              setChromeTabs((prev) =>
                                prev.map((t) =>
                                  t.id === activeChromeTab.id
                                    ? { ...t, selectedArticleIdx: null }
                                    : t
                                )
                              )
                            }
                            className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Retour aux résultats extraits
                          </button>
                          <p className="text-xs font-bold text-blue-600">
                            {trace.extractedItems[activeChromeTab.selectedArticleIdx].source} ·{' '}
                            {trace.extractedItems[activeChromeTab.selectedArticleIdx].timeAgo}
                          </p>
                          <h4 className="mt-1 text-base font-bold text-slate-900">
                            {trace.extractedItems[activeChromeTab.selectedArticleIdx].headline}
                          </h4>
                          <p className="mt-2 text-xs leading-relaxed text-slate-700">
                            {trace.extractedItems[activeChromeTab.selectedArticleIdx].summary}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const item =
                                  trace.extractedItems[activeChromeTab.selectedArticleIdx!];
                                setEditorFileName('Note_Veille_Chrome.md');
                                setEditorContent(
                                  `# ${item.headline}\n**Source :** ${item.source} (${item.timeAgo})\n\n${item.summary}\n`
                                );
                                launchApp('writer', 'Note_Veille_Chrome.md — LibreOffice Writer');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a73e8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Ouvrir dans LibreOffice Writer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {trace.extractedItems.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() =>
                                setChromeTabs((prev) =>
                                  prev.map((t) =>
                                    t.id === activeChromeTab.id
                                      ? { ...t, selectedArticleIdx: idx }
                                      : t
                                  )
                                )
                              }
                              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-blue-400 hover:bg-blue-50/20"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-bold text-blue-700">
                                  0{idx + 1}. {item.source}
                                </span>
                                <span>{item.timeAgo}</span>
                              </div>
                              <h4 className="mt-1 text-sm font-bold text-slate-900">
                                {item.headline}
                              </h4>
                              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                {item.summary}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================================
                WINDOW 2: TERMINAL EMULATOR (Interactive Bash Shell)
               ===================================================================== */}
            {windows.terminal.isOpen && !windows.terminal.isMinimized && (
              <div
                onMouseDown={() => bringToFront('terminal')}
                style={
                  windows.terminal.isMaximized
                    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 46px)', zIndex: windows.terminal.zIndex }
                    : {
                        top: windows.terminal.y,
                        left: windows.terminal.x,
                        width: windows.terminal.width,
                        height: windows.terminal.height,
                        zIndex: windows.terminal.zIndex,
                      }
                }
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#454545] bg-[#0f141c] text-slate-100 shadow-2xl"
              >
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('terminal');
                    setDraggingWin({
                      id: 'terminal',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.terminal.x,
                      origY: windows.terminal.y,
                    });
                  }}
                  className="flex h-8 shrink-0 cursor-move items-center justify-between border-b border-[#3a3a3a] bg-[#262626] px-3 text-xs font-semibold text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{windows.terminal.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMinimizeApp('terminal')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMaximizeApp('terminal')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => closeApp('terminal')}
                      className="rounded-xs p-0.5 hover:bg-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Command Bar (Executes on REAL Linux Kernel!) */}
                <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-[#171e29] px-3 py-1.5 text-[11px]">
                  <span className="font-semibold text-emerald-400">
                    Noyau Linux Réel :
                  </span>
                  {[
                    'uname -a',
                    'cat /etc/os-release',
                    'ls -la',
                    'python3 agent_worker.py',
                    'bash system_check.sh',
                    'df -h',
                    'ps aux',
                    'clear',
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      disabled={isExecutingCmd}
                      onClick={() => {
                        void runTerminalCommand(cmd);
                      }}
                      className="rounded-sm bg-white/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300 hover:bg-white/20 disabled:opacity-50"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>

                {/* Terminal Output & Input */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
                  {terminalHistory.map((entry) => (
                    <div key={entry.id} className="mb-3">
                      <div>
                        <span className="font-bold text-emerald-400">
                          {entry.prompt}
                        </span>{' '}
                        <span className="text-white">{entry.command}</span>
                      </div>
                      {entry.output.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap text-slate-300">
                          {line}
                        </div>
                      ))}
                    </div>
                  ))}

                  <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2">
                    <span className="shrink-0 font-bold text-emerald-400">
                      {getPromptPrefix()}
                    </span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Exécutez une vraie commande Linux (uname -a, cat /etc/os-release, python3 -c 'print(2+2)', ls -la)..."
                      className="w-full bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </form>
                </div>
              </div>
            )}

            {/* =====================================================================
                WINDOW 3: THUNAR FILE MANAGER (Home, File System, Documents, Trash)
               ===================================================================== */}
            {windows.files.isOpen && !windows.files.isMinimized && (
              <div
                onMouseDown={() => bringToFront('files')}
                style={
                  windows.files.isMaximized
                    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 46px)', zIndex: windows.files.zIndex }
                    : {
                        top: windows.files.y,
                        left: windows.files.x,
                        width: windows.files.width,
                        height: windows.files.height,
                        zIndex: windows.files.zIndex,
                      }
                }
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#454545] bg-[#1e2229] text-slate-100 shadow-2xl"
              >
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('files');
                    setDraggingWin({
                      id: 'files',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.files.x,
                      origY: windows.files.y,
                    });
                  }}
                  className="flex h-8 shrink-0 cursor-move items-center justify-between border-b border-[#3a3a3a] bg-[#262626] px-3 text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                    <span>{currentFolder} — File Manager (Thunar)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMinimizeApp('files')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMaximizeApp('files')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => closeApp('files')}
                      className="rounded-xs p-0.5 hover:bg-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-white/10 bg-[#252a34] px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                    <span>Emplacement :</span>
                    <span className="rounded-sm bg-black/40 px-2.5 py-0.5 text-amber-300">
                      {currentFolder === 'File System'
                        ? '/'
                        : currentFolder === 'Home'
                          ? '/home/user'
                          : `/home/user/${currentFolder}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={createNewFileInCurrentFolder}
                    className="inline-flex items-center gap-1 rounded-md bg-[#0284c7] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-500"
                  >
                    <Plus className="h-3 w-3" />
                    Nouveau Fichier
                  </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Left Places Sidebar */}
                  <div className="w-28 sm:w-44 shrink-0 space-y-1 border-r border-white/10 bg-[#181b21] p-1.5 sm:p-2 text-xs">
                    {(
                      [
                        { id: 'Home', label: 'Home', icon: Home },
                        { id: 'Desktop', label: 'Desktop', icon: Monitor },
                        { id: 'Documents', label: 'Documents (RAG)', icon: FileText },
                        { id: 'Pictures', label: 'Pictures', icon: Palette },
                        { id: 'Downloads', label: 'Downloads', icon: Download },
                        { id: 'File System', label: 'File System (/)', icon: HardDrive },
                        { id: 'Trash', label: 'Trash', icon: Trash2 },
                      ] as const
                    ).map((place) => {
                      const Icon = place.icon;
                      const active = currentFolder === place.id;
                      return (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => setCurrentFolder(place.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition ${
                            active
                              ? 'bg-[#0284c7] font-semibold text-white'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{place.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Files Grid */}
                  <div className="flex-1 overflow-y-auto p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {vmFiles
                        .filter((f) =>
                          currentFolder === 'Home'
                            ? f.folder !== 'Trash'
                            : f.folder === currentFolder
                        )
                        .map((file) => (
                          <div
                            key={file.id}
                            onClick={() => openVmFile(file)}
                            className="group flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2.5 transition hover:border-sky-500/50 hover:bg-sky-500/10"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <FileText className="h-6 w-6 shrink-0 text-amber-300" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-white">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {file.sizeLabel} · {file.folder}
                                </p>
                              </div>
                            </div>
                            {file.folder !== 'Trash' && (
                              <button
                                type="button"
                                onClick={(e) => moveFileToTrash(file.id, e)}
                                title="Envoyer à la corbeille"
                                className="rounded-md p-1 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                WINDOW 4: LIBREOFFICE WRITER / MOUSEPAD EDITOR
               ===================================================================== */}
            {windows.writer.isOpen && !windows.writer.isMinimized && (
              <div
                onMouseDown={() => bringToFront('writer')}
                style={
                  windows.writer.isMaximized
                    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 46px)', zIndex: windows.writer.zIndex }
                    : {
                        top: windows.writer.y,
                        left: windows.writer.x,
                        width: windows.writer.width,
                        height: windows.writer.height,
                        zIndex: windows.writer.zIndex,
                      }
                }
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#454545] bg-white text-slate-900 shadow-2xl"
              >
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('writer');
                    setDraggingWin({
                      id: 'writer',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.writer.x,
                      origY: windows.writer.y,
                    });
                  }}
                  className="flex h-8 shrink-0 cursor-move items-center justify-between border-b border-slate-300 bg-[#262626] px-3 text-xs font-semibold text-white"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-sky-400" />
                    <span>{editorFileName} — LibreOffice Writer</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMinimizeApp('writer')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMaximizeApp('writer')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => closeApp('writer')}
                      className="rounded-xs p-0.5 hover:bg-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Writer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Fichier :</span>
                    <input
                      type="text"
                      value={editorFileName}
                      onChange={(e) => setEditorFileName(e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-900"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEditorToVm(false)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Save className="h-3.5 w-3.5 text-blue-600" />
                      Enregistrer sur la VM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEditorToVm(true)}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <Database className="h-3.5 w-3.5" />
                      Indexer dans la Base RAG
                    </button>
                  </div>
                </div>

                {editorStatusMsg && (
                  <div className="bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    ✓ {editorStatusMsg}
                  </div>
                )}

                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 resize-none p-4 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none"
                />
              </div>
            )}

            {/* =====================================================================
                WINDOW 5: XPAINT / LIBREOFFICE DRAW (Interactive HTML5 Canvas)
               ===================================================================== */}
            {windows.paint.isOpen && !windows.paint.isMinimized && (
              <div
                onMouseDown={() => bringToFront('paint')}
                style={
                  windows.paint.isMaximized
                    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 46px)', zIndex: windows.paint.zIndex }
                    : {
                        top: windows.paint.y,
                        left: windows.paint.x,
                        width: windows.paint.width,
                        height: windows.paint.height,
                        zIndex: windows.paint.zIndex,
                      }
                }
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#454545] bg-[#f8fafc] text-slate-900 shadow-2xl"
              >
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('paint');
                    setDraggingWin({
                      id: 'paint',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.paint.x,
                      origY: windows.paint.y,
                    });
                  }}
                  className="flex h-8 shrink-0 cursor-move items-center justify-between border-b border-slate-300 bg-[#262626] px-3 text-xs font-semibold text-white"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="h-3.5 w-3.5 text-rose-400" />
                    <span>{windows.paint.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMinimizeApp('paint')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMaximizeApp('paint')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => closeApp('paint')}
                      className="rounded-xs p-0.5 hover:bg-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* XPaint Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaintTool('pen')}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                        paintTool === 'pen'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Pencil className="h-3 w-3" />
                      Crayon
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('rect')}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                        paintTool === 'rect'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Square className="h-3 w-3" />
                      Rectangle
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('circle')}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                        paintTool === 'circle'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CircleIcon className="h-3 w-3" />
                      Cercle
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('eraser')}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                        paintTool === 'eraser'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Eraser className="h-3 w-3" />
                      Gomme
                    </button>

                    <div className="mx-1 flex items-center gap-1">
                      {['#ff2a1f', '#1a56db', '#10b981', '#f59e0b', '#7c3aed', '#0f172a'].map(
                        (c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setPaintColor(c)}
                            style={{ backgroundColor: c }}
                            className={`h-4 w-4 rounded-full border ${
                              paintColor === c ? 'ring-2 ring-slate-900' : 'border-slate-300'
                            }`}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={clearPaintCanvas}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-200"
                    >
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={savePaintToVm}
                      className="inline-flex items-center gap-1 rounded-md bg-[#1a56db] px-2.5 py-1 font-semibold text-white hover:bg-blue-700"
                    >
                      <Save className="h-3 w-3" />
                      Enregistrer PNG
                    </button>
                  </div>
                </div>

                {paintSavedBanner && (
                  <div className="bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    ✓ {paintSavedBanner}
                  </div>
                )}

                <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-200 p-2">
                  <canvas
                    ref={canvasRef}
                    width={660}
                    height={360}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="cursor-crosshair rounded-sm border border-slate-300 bg-white shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* =====================================================================
                WINDOW 6: MAIL READER
               ===================================================================== */}
            {windows.mail.isOpen && !windows.mail.isMinimized && (
              <div
                onMouseDown={() => bringToFront('mail')}
                style={{
                  top: windows.mail.y,
                  left: windows.mail.x,
                  width: windows.mail.width,
                  height: windows.mail.height,
                  zIndex: windows.mail.zIndex,
                }}
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#454545] bg-white text-slate-900 shadow-2xl"
              >
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('mail');
                    setDraggingWin({
                      id: 'mail',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.mail.x,
                      origY: windows.mail.y,
                    });
                  }}
                  className="flex h-8 shrink-0 cursor-move items-center justify-between bg-[#262626] px-3 text-xs font-semibold text-white"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-amber-400" />
                    <span>{windows.mail.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMinimizeApp('mail')}
                      className="rounded-xs p-0.5 hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => closeApp('mail')}
                      className="rounded-xs p-0.5 hover:bg-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                  <div className="w-full sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50 p-2">
                    <p className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Boîte de réception ({inboxEmails.length})
                    </p>
                    {inboxEmails.map((em, idx) => (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => setSelectedMailIdx(idx)}
                        className={`mb-1 w-full rounded-lg p-2.5 text-left transition ${
                          selectedMailIdx === idx
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="truncate font-bold">{em.from}</span>
                          <span>{em.time}</span>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold">
                          {em.subject}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {inboxEmails[selectedMailIdx].tag}
                      </span>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">
                        {inboxEmails[selectedMailIdx].subject}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        De : {inboxEmails[selectedMailIdx].from}
                      </p>
                      <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                        {inboxEmails[selectedMailIdx].body}
                      </pre>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      {mailSentNotice && (
                        <p className="mb-2 text-xs font-semibold text-emerald-600">
                          ✓ {mailSentNotice}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mailReplyText}
                          onChange={(e) => setMailReplyText(e.target.value)}
                          placeholder="Répondre ou transférer via l'agent..."
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMailSentNotice(
                              `Réponse envoyée à ${inboxEmails[selectedMailIdx].from} via MCP`
                            );
                            setMailReplyText('');
                            setTimeout(() => setMailSentNotice(null), 3000);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Envoyer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                WINDOW 7: XPDF / RISTRETTO VIEWER
               ===================================================================== */}
            {windows.viewer.isOpen && !windows.viewer.isMinimized && (
              <div
                onMouseDown={() => bringToFront('viewer')}
                style={{
                  top: windows.viewer.y,
                  left: windows.viewer.x,
                  width: windows.viewer.width,
                  height: windows.viewer.height,
                  zIndex: windows.viewer.zIndex,
                }}
                className="absolute max-sm:!top-1 max-sm:!left-1 max-sm:!w-[calc(100%-8px)] max-sm:!h-[calc(100%-50px)] flex flex-col overflow-hidden rounded-t-md border border-[#454545] bg-[#1e2229] text-slate-100 shadow-2xl"
              >
                <div
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    bringToFront('viewer');
                    setDraggingWin({
                      id: 'viewer',
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: windows.viewer.x,
                      origY: windows.viewer.y,
                    });
                  }}
                  className="flex h-8 shrink-0 cursor-move items-center justify-between bg-[#262626] px-3 text-xs font-semibold"
                >
                  <span>{windows.viewer.title}</span>
                  <button
                    type="button"
                    onClick={() => closeApp('viewer')}
                    className="rounded-xs p-0.5 hover:bg-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {activeViewerFile?.kind === 'image' &&
                  activeViewerFile.content.startsWith('data:image') ? (
                    <div className="flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeViewerFile.content}
                        alt={activeViewerFile.name}
                        className="max-h-72 rounded-md border border-white/10 bg-white"
                      />
                      <p className="mt-2 text-xs text-slate-300">
                        {activeViewerFile.path}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white p-4 text-slate-900 shadow-md">
                      <p className="text-xs font-bold text-red-600 uppercase">
                        xpdf Reader · {activeViewerFile?.name}
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
                        {activeViewerFile?.content}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================================
                WINDOW 8: TASK MANAGER / RUN PROGRAM / ABOUT XFCE
               ===================================================================== */}
            {(windows.taskmgr.isOpen || windows.run.isOpen || windows.about.isOpen) && (
              <div
                style={{
                  top: 90,
                  left: 240,
                  width: 500,
                  zIndex: 45,
                }}
                className="absolute max-sm:!top-3 max-sm:!left-2 max-sm:!w-[calc(100%-16px)] flex flex-col overflow-hidden rounded-md border border-[#454545] bg-[#22262e] text-slate-100 shadow-2xl"
              >
                <div className="flex h-8 items-center justify-between bg-[#2c2c2c] px-3 text-xs font-semibold">
                  <span>
                    {windows.run.isOpen
                      ? 'Application Finder / Run Program...'
                      : windows.taskmgr.isOpen
                        ? 'Task Manager — e2b.local'
                        : 'About Xfce & E2B Cloud VM'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      closeApp('taskmgr');
                      closeApp('run');
                      closeApp('about');
                    }}
                    className="rounded-xs p-0.5 hover:bg-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {windows.run.isOpen ? (
                  <div className="p-4">
                    <p className="text-xs text-slate-300">
                      Lancez une application de bureau ou envoyez une instruction directe à{' '}
                      <strong>{agent.name}</strong> :
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={runQuery}
                        onChange={(e) => setRunQuery(e.target.value)}
                        placeholder="Ex: chrome, terminal, xpaint, ou prompt pour l'agent..."
                        className="flex-1 rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const q = runQuery.trim().toLowerCase();
                          if (q.includes('chrome') || q.includes('web')) launchApp('chrome');
                          else if (q.includes('term') || q.includes('bash')) launchApp('terminal');
                          else if (q.includes('paint') || q.includes('draw')) launchApp('paint');
                          else if (q.includes('file') || q.includes('home')) launchApp('files');
                          else if (q) {
                            launchApp('chrome');
                            executeChromeNavigation(runQuery);
                          }
                          setRunQuery('');
                          closeApp('run');
                        }}
                        className="rounded-md bg-[#0284c7] px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                      >
                        Exécuter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-xs leading-relaxed text-slate-300">
                    <p className="font-bold text-white">
                      {osSkin === 'ubuntu'
                        ? 'Ubuntu 24.04 LTS (GNOME) · Connecté au Noyau Linux Réel'
                        : osSkin === 'windows11'
                          ? 'Windows 11 Pro Cloud Workstation · Sous-système Linux WSL2 Réel'
                          : 'Xfce 4.18 Desktop Environment · E2B Cloud Sandbox'}
                    </p>
                    <p className="mt-1">
                      Distribution serveur :{' '}
                      <span className="font-mono text-emerald-400">
                        {realSystemInfo?.distro || 'Debian/Ubuntu Linux'}
                      </span>
                    </p>
                    <p className="mt-0.5">
                      Noyau & Arch :{' '}
                      <span className="font-mono text-sky-400">
                        {realSystemInfo
                          ? `${realSystemInfo.kernel} (${realSystemInfo.arch})`
                          : 'Linux x86_64'}
                      </span>
                    </p>
                    <div className="mt-3 rounded-md bg-black/40 p-2.5 font-mono text-[11px]">
                      <div>
                        CPU : {realSystemInfo?.cpuModel || 'Cloud vCPU'} ({realSystemInfo?.cores || 2} cœurs)
                      </div>
                      <div>
                        RAM : {realSystemInfo?.freeMemMb || 1024} MB libre / {realSystemInfo?.totalMemMb || 4096} MB total
                      </div>
                      <div>
                        Runtimes : {realSystemInfo?.pythonVersion || 'Python 3'} · Node {realSystemInfo?.nodeVersion || 'v22'}
                      </div>
                      <div>
                        Disque monté : {realSystemInfo?.workdir || '/tmp/orbit-vm'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                3D. BOTTOM DOCK PANEL (Frosted-Glass OS Dock with Active Indicators)
               ===================================================================== */}
            <div className="absolute bottom-1.5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/15 bg-[#1e1e24]/85 px-3 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md">
              {/* 1. Show Desktop */}
              <button
                type="button"
                onClick={showDesktopAll}
                title="Show Desktop"
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="flex h-7 w-8 items-center justify-center rounded-lg border border-sky-300/60 bg-linear-to-b from-[#5cc3ff] to-[#1e88e5] shadow-xs">
                  <Minimize2 className="h-4 w-4 text-white" />
                </div>
              </button>

              {/* 2. Terminal Emulator ($_) */}
              <button
                type="button"
                onClick={() => launchApp('terminal')}
                title="Terminal Emulator (Vrai Bash Linux)"
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="flex h-7 w-8 items-center justify-center rounded-lg border border-slate-500 bg-[#141418] font-mono text-xs font-bold text-emerald-400 shadow-xs">
                  $_
                </div>
                {windows.terminal.isOpen && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* 3. File Manager (Home Folder) */}
              <button
                type="button"
                onClick={() => {
                  setCurrentFolder('Home');
                  launchApp('files', 'Home — File Manager (Thunar)');
                }}
                title="File Manager (/home/user)"
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="flex h-7 w-8 items-center justify-center rounded-lg border border-slate-300 bg-linear-to-b from-slate-100 to-slate-300 shadow-xs">
                  <Home className="h-4 w-4 text-slate-700" />
                </div>
                {windows.files.isOpen && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-sky-400" />
                )}
              </button>

              {/* 4. Web Browser (Blue Globe — Google Chrome) */}
              <button
                type="button"
                onClick={() => launchApp('chrome')}
                title="Web Browser (Google Chrome)"
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-300/50 bg-linear-to-b from-[#38bdf8] via-[#0284c7] to-[#1d4ed8] shadow-md">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                {windows.chrome.isOpen && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-sky-400" />
                )}
              </button>

              {/* 5. Application Finder (Magnifying Glass) */}
              <button
                type="button"
                onClick={() => launchApp('run')}
                title="Application Finder"
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Search className="h-5 w-5 text-slate-200 transition group-hover:scale-110" />
                {windows.run.isOpen && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-sky-400" />
                )}
              </button>

              <div className="mx-0.5 h-6 w-px bg-white/15" />

              {/* 6. Documents / Knowledge Directory Folder */}
              <button
                type="button"
                onClick={() => {
                  setCurrentFolder('Documents');
                  launchApp('files', 'Documents (RAG) — File Manager');
                }}
                title="Documents & Agent RAG Files"
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className="flex h-7 w-8 items-center justify-center rounded-lg border border-amber-300/70 bg-linear-to-b from-[#f6d9a8] to-[#dfb16b] shadow-xs">
                  <Folder className="h-4 w-4 text-amber-950/70" />
                </div>
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

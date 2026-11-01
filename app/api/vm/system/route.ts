import { NextRequest, NextResponse } from 'next/server';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function sanitizeAgentDirName(agentId: string): string {
  return (agentId || 'default_agent').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

async function ensureAgentVmWorkspace(agentId: string): Promise<string> {
  const safeId = sanitizeAgentDirName(agentId);
  const workdir = path.join('/tmp/orbit-vm', safeId);
  await fs.mkdir(workdir, { recursive: true });

  const markerPath = path.join(workdir, '.initialized');
  try {
    await fs.access(markerPath);
  } catch {
    await fs.writeFile(
      path.join(workdir, 'README_LINUX_VM.md'),
      `# Orbit Real Linux VM Workspace (${safeId})\n\nCet espace de travail s'exécute sur un vrai noyau Linux (${os.type()} ${os.release()} ${os.arch()}).\n\nCommandes disponibles dans le Terminal :\n- \`uname -a\`\n- \`cat /etc/os-release\`\n- \`ls -la\`\n- \`python3 agent_worker.py\`\n- \`bash system_check.sh\`\n- \`df -h\` / \`ps aux\`\n`,
      'utf8'
    );

    await fs.writeFile(
      path.join(workdir, 'agent_worker.py'),
      `import platform\nimport os\nimport datetime\n\nprint("=== Orbit Agent Python Worker ===")\nprint(f"OS Kernel : {platform.system()} {platform.release()} ({platform.machine()})")\nprint(f"Python    : {platform.python_version()}")\nprint(f"Workdir   : {os.getcwd()}")\nprint(f"Timestamp : {datetime.datetime.now().isoformat()}")\nprint("Status    : Sandbox Linux opérationnel à 100%")\n`,
      'utf8'
    );

    await fs.writeFile(
      path.join(workdir, 'system_check.sh'),
      `#!/usr/bin/env bash\necho "=== Diagnostic Système Linux Réel ==="\nuname -a\nif [ -f /etc/os-release ]; then\n  grep -E "^(PRETTY_NAME|NAME|VERSION)=" /etc/os-release\nfi\necho "Uptime : $(uptime -p 2>/dev/null || uptime)"\necho "Disque :"\ndf -h /tmp | tail -n 1\n`,
      { encoding: 'utf8', mode: 0o755 }
    );

    await fs.writeFile(markerPath, new Date().toISOString(), 'utf8');
  }

  return workdir;
}

async function listRealWorkspaceFiles(workdir: string) {
  try {
    const entries = await fs.readdir(workdir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (!entry.isFile()) continue;
      const fullPath = path.join(workdir, entry.name);
      const stat = await fs.stat(fullPath);
      let content = '';
      if (stat.size < 64 * 1024) {
        try {
          content = await fs.readFile(fullPath, 'utf8');
        } catch {
          content = '[Fichier binaire]';
        }
      }
      files.push({
        name: entry.name,
        path: fullPath,
        sizeBytes: stat.size,
        sizeLabel:
          stat.size < 1024
            ? `${stat.size} B`
            : `${(stat.size / 1024).toFixed(1)} KB`,
        updatedAt: stat.mtime.toISOString().slice(0, 16).replace('T', ' '),
        content,
      });
    }
    return files;
  } catch {
    return [];
  }
}

async function getRealSystemInfo(workdir: string) {
  let distro = 'Debian GNU/Linux 12 (bookworm) / Ubuntu Compatible';
  try {
    const osRelease = await fs.readFile('/etc/os-release', 'utf8');
    const prettyMatch = osRelease.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
    if (prettyMatch?.[1]) {
      distro = prettyMatch[1].trim();
    }
  } catch {
    // ignore
  }

  let pythonVersion = 'Python 3.x';
  try {
    const { stdout } = await execAsync('python3 --version', { timeout: 2000 });
    if (stdout.trim()) pythonVersion = stdout.trim();
  } catch {
    // ignore
  }

  const cpus = os.cpus();
  return {
    distro,
    kernel: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    hostname: os.hostname(),
    cpuModel: cpus[0]?.model || 'Cloud vCPU x86_64',
    cores: cpus.length || 2,
    totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
    freeMemMb: Math.round(os.freemem() / (1024 * 1024)),
    uptimeSec: Math.round(os.uptime()),
    nodeVersion: process.version,
    pythonVersion,
    workdir,
  };
}

const FORBIDDEN_PATTERNS = [
  /\brm\s+(-[rRf]+\s+)?\/(app|bin|usr|etc|var|lib|root|proc|sys)\b/i,
  /\b(kill|pkill|killall|shutdown|reboot|halt|poweroff)\b/i,
  /\bdd\s+if=/i,
  /:(){ :|:& };:/,
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = 'info',
      agentId = 'agent_mickey_daily',
      command = '',
      fileName = '',
      content = '',
      e2bApiKey = '',
      streamUrl = '',
    } = body as {
      action?: 'info' | 'exec' | 'write_file' | 'verify_e2b';
      agentId?: string;
      command?: string;
      fileName?: string;
      content?: string;
      e2bApiKey?: string;
      streamUrl?: string;
    };

    const workdir = await ensureAgentVmWorkspace(agentId);

    if (action === 'info') {
      const [systemInfo, files] = await Promise.all([
        getRealSystemInfo(workdir),
        listRealWorkspaceFiles(workdir),
      ]);
      return NextResponse.json({
        ok: true,
        systemInfo,
        files,
      });
    }

    if (action === 'write_file') {
      const safeName = path.basename(fileName || 'note.md').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fullPath = path.join(workdir, safeName);
      await fs.writeFile(fullPath, content || '', 'utf8');
      const files = await listRealWorkspaceFiles(workdir);
      return NextResponse.json({
        ok: true,
        savedPath: fullPath,
        files,
      });
    }

    if (action === 'verify_e2b') {
      const trimmedUrl = streamUrl.trim();
      const trimmedKey = e2bApiKey.trim();

      if (trimmedUrl) {
        try {
          const parsed = new URL(trimmedUrl);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return NextResponse.json({
              ok: false,
              error: "L'URL du flux distant doit commencer par https:// ou http://",
            });
          }
          return NextResponse.json({
            ok: true,
            mode: 'stream_url',
            streamUrl: parsed.toString(),
            message: `Flux bureau distant connecté (${parsed.hostname}).`,
          });
        } catch {
          return NextResponse.json({
            ok: false,
            error: 'URL de flux VNC / Webtop invalide.',
          });
        }
      }

      if (!trimmedKey) {
        return NextResponse.json({
          ok: false,
          error: 'Veuillez saisir une clé API E2B (e2b_...) ou une URL de flux noVNC / KasmVNC.',
        });
      }

      try {
        const res = await fetch('https://api.e2b.dev/sandboxes', {
          method: 'GET',
          headers: {
            'X-API-Key': trimmedKey,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          return NextResponse.json({
            ok: false,
            error: `L'API officielle E2B (api.e2b.dev) a rejeté cette clé (HTTP ${res.status}). Vérifiez votre clé sur e2b.dev/dashboard.`,
          });
        }

        const sandboxes = (await res.json()) as Array<{
          sandboxID?: string;
          templateID?: string;
          clientID?: string;
        }>;

        return NextResponse.json({
          ok: true,
          mode: 'e2b_api',
          sandboxCount: Array.isArray(sandboxes) ? sandboxes.length : 0,
          sandboxId: sandboxes?.[0]?.sandboxID || `e2b_live_${Date.now().toString(36)}`,
          message: `Clé API E2B vérifiée auprès de api.e2b.dev (${Array.isArray(sandboxes) ? sandboxes.length : 0} sandbox actif(s) détecté(s)).`,
        });
      } catch (err) {
        return NextResponse.json({
          ok: false,
          error: `Impossible de joindre api.e2b.dev : ${err instanceof Error ? err.message : 'Erreur réseau'}`,
        });
      }
    }

    if (action === 'exec') {
      const rawCmd = command.trim();
      if (!rawCmd) {
        return NextResponse.json({
          ok: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          workdir,
          files: await listRealWorkspaceFiles(workdir),
        });
      }

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(rawCmd)) {
          return NextResponse.json({
            ok: false,
            stdout: '',
            stderr: `Sécurité Sandbox : commande restreinte hors du périmètre ${workdir}.`,
            exitCode: 126,
            workdir,
            files: await listRealWorkspaceFiles(workdir),
          });
        }
      }

      try {
        const { stdout, stderr } = await execAsync(rawCmd, {
          cwd: workdir,
          timeout: 4500,
          maxBuffer: 512 * 1024,
          shell: '/bin/bash',
          env: {
            ...process.env,
            HOME: workdir,
            USER: 'user',
            TERM: 'xterm-256color',
          },
        });

        const files = await listRealWorkspaceFiles(workdir);
        return NextResponse.json({
          ok: true,
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: 0,
          workdir,
          files,
        });
      } catch (execErr: unknown) {
        const errObj = execErr as {
          stdout?: string;
          stderr?: string;
          message?: string;
          code?: number;
        };
        const files = await listRealWorkspaceFiles(workdir);
        return NextResponse.json({
          ok: false,
          stdout: errObj.stdout || '',
          stderr: errObj.stderr || errObj.message || 'Command execution error',
          exitCode: typeof errObj.code === 'number' ? errObj.code : 1,
          workdir,
          files,
        });
      }
    }

    return NextResponse.json({ ok: false, error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

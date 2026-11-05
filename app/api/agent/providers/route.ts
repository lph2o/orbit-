import { NextRequest, NextResponse } from 'next/server';
import { FreeAgentApiProviderId } from '@/lib/types';

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const checkedAtTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    const body = await req.json();
    const providerId = (body.providerId || 'google_ai_studio') as FreeAgentApiProviderId;
    const rawKey = (body.rawKey || '').trim();

    if (!rawKey) {
      return NextResponse.json({
        healthy: false,
        statusLabel: 'erreur',
        errorDetail: 'Aucune clé API fournie',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: 'Non configuré',
      });
    }

    const signal = AbortSignal.timeout(8000);

    if (providerId === 'google_ai_studio') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(rawKey)}`,
        { method: 'GET', signal }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.models)) {
        const errMsg =
          data?.error?.message || `HTTP ${res.status}: Clé Google AI Studio invalide`;
        return NextResponse.json({
          healthy: false,
          statusLabel: 'erreur',
          errorDetail: errMsg,
          latencyMs: Date.now() - startedAt,
          checkedAtTime,
          modeLabel: `Échec HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        healthy: true,
        statusLabel: 'sain',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: `Google AI Studio vérifié (${data.models.length} modèles accessibles)`,
      });
    }

    if (providerId === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${rawKey}` },
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.data)) {
        const errMsg =
          data?.error?.message || `HTTP ${res.status}: Clé API Groq invalide`;
        return NextResponse.json({
          healthy: false,
          statusLabel: 'erreur',
          errorDetail: errMsg,
          latencyMs: Date.now() - startedAt,
          checkedAtTime,
          modeLabel: `Échec HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        healthy: true,
        statusLabel: 'sain',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: `Groq LPU vérifié (${data.data.length} modèles actifs)`,
      });
    }

    if (providerId === 'openrouter' || providerId === 'orcarouter') {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: { Authorization: `Bearer ${rawKey}` },
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.data) {
        const errMsg =
          data?.error?.message || `HTTP ${res.status}: Clé OpenRouter invalide`;
        return NextResponse.json({
          healthy: false,
          statusLabel: 'erreur',
          errorDetail: errMsg,
          latencyMs: Date.now() - startedAt,
          checkedAtTime,
          modeLabel: `Échec HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        healthy: true,
        statusLabel: 'sain',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: 'Clé OpenRouter authentifiée en direct',
      });
    }

    if (providerId === 'huggingface_router') {
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        method: 'GET',
        headers: { Authorization: `Bearer ${rawKey}` },
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.name) {
        const errMsg =
          data?.error || `HTTP ${res.status}: Jeton HuggingFace (hf_...) invalide`;
        return NextResponse.json({
          healthy: false,
          statusLabel: 'erreur',
          errorDetail: errMsg,
          latencyMs: Date.now() - startedAt,
          checkedAtTime,
          modeLabel: `Échec HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        healthy: true,
        statusLabel: 'sain',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: `Compte HuggingFace vérifié (@${data.name})`,
      });
    }

    if (providerId === 'nvidia_nim') {
      const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${rawKey}` },
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data?.data) || !rawKey.startsWith('nvapi-')) {
        return NextResponse.json({
          healthy: false,
          statusLabel: 'erreur',
          errorDetail: !rawKey.startsWith('nvapi-')
            ? 'Format de clé NVIDIA NIM invalide (doit commencer par nvapi-...)'
            : `HTTP ${res.status}: Clé NVIDIA NIM refusée`,
          latencyMs: Date.now() - startedAt,
          checkedAtTime,
          modeLabel: `Échec HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        healthy: true,
        statusLabel: 'sain',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: 'Clé NVIDIA NIM authentifiée en direct',
      });
    }

    if (providerId === 'speechify') {
      const res = await fetch('https://api.sws.speechify.com/v1/voices', {
        method: 'GET',
        headers: { Authorization: `Bearer ${rawKey}` },
        signal,
      });
      if (!res.ok) {
        return NextResponse.json({
          healthy: false,
          statusLabel: 'erreur',
          errorDetail: `HTTP ${res.status}: Clé API Speechify invalide ou non autorisée`,
          latencyMs: Date.now() - startedAt,
          checkedAtTime,
          modeLabel: `Échec HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        healthy: true,
        statusLabel: 'sain',
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: 'API Speechify TTS vérifiée en direct',
      });
    }

    // For router9 / bai_promo: perform real HTTP verification against their endpoint
    const endpointUrl =
      providerId === 'router9'
        ? 'https://api.router9.ai/v1/models'
        : 'https://api.together.xyz/v1/models';

    const res = await fetch(endpointUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rawKey}` },
      signal,
    });
    if (!res.ok) {
      return NextResponse.json({
        healthy: false,
        statusLabel: 'erreur',
        errorDetail: `HTTP ${res.status}: Clé API refusée par ${providerId}`,
        latencyMs: Date.now() - startedAt,
        checkedAtTime,
        modeLabel: `Échec HTTP ${res.status}`,
      });
    }

    return NextResponse.json({
      healthy: true,
      statusLabel: 'sain',
      latencyMs: Date.now() - startedAt,
      checkedAtTime,
      modeLabel: 'API vérifiée en direct',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return NextResponse.json({
      healthy: false,
      statusLabel: 'erreur',
      errorDetail: msg.includes('fetch') ? 'fetch failed' : msg,
      latencyMs: Date.now() - startedAt,
      checkedAtTime,
      modeLabel: 'Erreur réseau / fetch failed',
    });
  }
}

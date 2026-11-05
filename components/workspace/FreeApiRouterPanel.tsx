'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Cpu,
  ExternalLink,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  AgentConfig,
  FreeAgentApiProvider,
  FreeAgentApiProviderId,
} from '@/lib/types';
import { getProviderHealthyKeyCount } from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';

export function FreeApiRouterPanel({
  agent,
  compact = false,
}: {
  agent?: AgentConfig;
  compact?: boolean;
}) {
  const {
    freeApiProviders,
    toggleFreeApiProvider,
    toggleFreeApiKey,
    addOrUpdateFreeApiKey,
    deleteFreeApiKey,
    verifyFreeApiKeyHealth,
    updateAgentConfig,
    addToast,
  } = useOrbit();

  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({
    google_ai_studio: true,
  });
  const [editingKeyTarget, setEditingKeyTarget] = useState<{
    providerId: FreeAgentApiProviderId;
    keyId?: string;
  } | null>(null);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [quickAddProviderId, setQuickAddProviderId] =
    useState<FreeAgentApiProviderId>('groq');
  const [showGlobalAddBar, setShowGlobalAddBar] = useState(false);

  const toggleExpand = (providerId: string) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const handleStartEditKey = (
    providerId: FreeAgentApiProviderId,
    keyId?: string,
    currentVal = ''
  ) => {
    setExpandedProviders((prev) => ({ ...prev, [providerId]: true }));
    setEditingKeyTarget({ providerId, keyId });
    setKeyInputValue(currentVal);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKeyTarget || !keyInputValue.trim() || savingProviderId) return;
    const targetProvider = editingKeyTarget.providerId;
    const targetKeyId = editingKeyTarget.keyId;
    const raw = keyInputValue.trim();

    setSavingProviderId(targetProvider);
    setEditingKeyTarget(null);
    setKeyInputValue('');
    try {
      await addOrUpdateFreeApiKey(targetProvider, raw, targetKeyId);
    } finally {
      setSavingProviderId(null);
    }
  };

  const handlePingKey = async (providerId: FreeAgentApiProviderId, keyId: string) => {
    setTestingKeyId(keyId);
    try {
      await verifyFreeApiKeyHealth(providerId, keyId);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleToggleProviderSwitch = (provider: FreeAgentApiProvider) => {
    const healthyCount = getProviderHealthyKeyCount(provider);
    if (!provider.isEnabled && healthyCount === 0) {
      setExpandedProviders((prev) => ({ ...prev, [provider.providerId]: true }));
      setEditingKeyTarget({ providerId: provider.providerId });
      addToast({
        title: `Aucune clé API connectée pour ${provider.name}`,
        description:
          'Ajoutez et vérifiez une vraie clé API avant d’activer ce fournisseur (zéro simulation).',
        type: 'info',
      });
      return;
    }
    toggleFreeApiProvider(provider.providerId);
  };

  const handleSelectProviderForAgent = async (provider: FreeAgentApiProvider) => {
    if (!agent) return;
    const healthyCount = getProviderHealthyKeyCount(provider);
    if (healthyCount === 0) {
      setExpandedProviders((prev) => ({ ...prev, [provider.providerId]: true }));
      setEditingKeyTarget({ providerId: provider.providerId });
      addToast({
        title: `Clé API requise pour ${provider.name}`,
        description: `Connectez d'abord une vraie clé ${provider.name} vérifiée ("sain") pour l'utiliser avec ${agent.name}.`,
        type: 'error',
      });
      return;
    }
    if (!provider.isEnabled) {
      toggleFreeApiProvider(provider.providerId, true);
    }
    await updateAgentConfig(agent.agentId, {
      model: provider.defaultModel,
      apiProviderId: provider.providerId,
    });
    addToast({
      title: `Moteur vérifié activé pour ${agent.name}`,
      description: `${provider.name} (${provider.availableModels[0]?.label || provider.defaultModel})`,
      type: 'success',
    });
  };

  const totalHealthyKeys = freeApiProviders.reduce(
    (acc, p) => acc + (p.isEnabled ? getProviderHealthyKeyCount(p) : 0),
    0
  );

  return (
    <div
      data-testid="free-api-router-panel"
      className="rounded-2xl bg-[#101216] text-slate-100 border border-slate-800/90 shadow-lg overflow-hidden"
    >
      {/* Top Bar */}
      <div className="px-3.5 py-3 sm:px-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-[#14171D]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                totalHealthyKeys > 0 ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <h3 className="text-xs sm:text-[13px] font-bold text-white tracking-tight">
              Routeur d’APIs d’Agents Gratuits
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${
                totalHealthyKeys > 0
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/15 text-slate-400'
              }`}
            >
              ● {totalHealthyKeys} {totalHealthyKeys > 1 ? 'sains' : 'sain'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Vérification HTTP 100% réelle en direct — aucune clé pré-remplie ni statut simulé.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGlobalAddBar((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          <span>Ajouter une vraie clé API</span>
        </button>
      </div>

      {/* Quick Global Add Bar */}
      {showGlobalAddBar && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!keyInputValue.trim() || savingProviderId) return;
            const raw = keyInputValue.trim();
            setSavingProviderId(quickAddProviderId);
            setExpandedProviders((prev) => ({ ...prev, [quickAddProviderId]: true }));
            setKeyInputValue('');
            setShowGlobalAddBar(false);
            try {
              await addOrUpdateFreeApiKey(quickAddProviderId, raw);
            } finally {
              setSavingProviderId(null);
            }
          }}
          className="p-3 bg-[#181B22] border-b border-white/10 space-y-2"
        >
          <p className="text-[11px] font-semibold text-slate-200">
            Tester et connecter une vraie clé API (vérifiée en direct auprès du fournisseur) :
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              aria-label="Fournisseur API gratuit"
              value={quickAddProviderId}
              onChange={(e) =>
                setQuickAddProviderId(e.target.value as FreeAgentApiProviderId)
              }
              className="rounded-lg bg-[#101216] border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            >
              {freeApiProviders.map((p) => (
                <option key={p.providerId} value={p.providerId}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={keyInputValue}
              onChange={(e) => setKeyInputValue(e.target.value)}
              placeholder="Collez votre vraie clé API (ex: AIzaSy..., gsk_..., sk-or-v1-..., hf_...)"
              aria-label="Nouvelle clé API gratuite"
              className="flex-1 min-w-0 rounded-lg bg-[#101216] border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors whitespace-nowrap"
            >
              Tester & Connecter
            </button>
          </div>
        </form>
      )}

      {/* Provider Rows List */}
      <div className="p-2 sm:p-3 space-y-1.5">
        {freeApiProviders.map((provider) => {
          const isExpanded = Boolean(expandedProviders[provider.providerId]);
          const healthyCount = getProviderHealthyKeyCount(provider);
          const hasAnyKey = provider.keys.length > 0;
          const isSelectedByAgent =
            agent &&
            healthyCount > 0 &&
            (agent.apiProviderId === provider.providerId ||
              agent.model === provider.defaultModel);

          return (
            <div
              key={provider.providerId}
              className="rounded-xl transition-colors"
            >
              {/* Main Provider Row */}
              <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Pill Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={provider.isEnabled && healthyCount > 0}
                    aria-label={`Activer ${provider.name}`}
                    onClick={() => handleToggleProviderSwitch(provider)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                      provider.isEnabled && healthyCount > 0
                        ? 'bg-[#252830] border-emerald-400/50'
                        : 'bg-[#17191E] border-white/10 opacity-60'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                        provider.isEnabled && healthyCount > 0
                          ? 'translate-x-4 bg-emerald-400 shadow-xs'
                          : 'translate-x-1 bg-slate-500'
                      }`}
                    />
                  </button>

                  {/* Provider Title + Key Count + Real Healthy Badge */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(provider.providerId)}
                    className="flex items-center gap-2 min-w-0 text-left flex-wrap"
                  >
                    <span className="text-xs sm:text-[13px] font-semibold text-white truncate">
                      {provider.name}
                    </span>

                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#23262F] text-[11px] font-mono font-bold text-slate-200">
                      {provider.keys.length}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          healthyCount > 0
                            ? 'bg-emerald-400'
                            : hasAnyKey
                              ? 'bg-red-400'
                              : 'bg-slate-600'
                        }`}
                      />
                      <span>
                        {healthyCount > 0
                          ? `${healthyCount} sain`
                          : hasAnyKey
                            ? '0 sain (erreur)'
                            : 'Non connecté'}
                      </span>
                    </span>

                    {isSelectedByAgent && (
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                        Actif sur {agent.name}
                      </span>
                    )}
                  </button>
                </div>

                {/* Right Controls: '...' and Chevron */}
                <div className="flex items-center gap-1 shrink-0">
                  {agent && !compact && healthyCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectProviderForAgent(provider)}
                      title={`Utiliser ${provider.name} pour ${agent.name}`}
                      className={`hidden sm:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                        isSelectedByAgent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                      }`}
                    >
                      <Cpu className="h-3 w-3" />
                      <span>{isSelectedByAgent ? 'Sélectionné' : 'Utiliser'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartEditKey(provider.providerId)}
                    aria-label={`Options et ajout de clé pour ${provider.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(provider.providerId)}
                    aria-label={`Déplier ${provider.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Key Drawer */}
              {isExpanded && (
                <div className="mt-1 mb-2 mx-1 sm:mx-2 rounded-xl bg-[#16181E] border border-white/10 p-3 space-y-2.5 shadow-inner">
                  {provider.keys.length === 0 &&
                    editingKeyTarget?.providerId !== provider.providerId && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 text-xs text-slate-400">
                        <span>
                          Aucune clé API enregistrée pour{' '}
                          <strong className="text-slate-200">{provider.name}</strong>.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditKey(provider.providerId)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors self-start sm:self-auto"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span>Connecter ma clé {provider.name}</span>
                        </button>
                      </div>
                    )}

                  {provider.keys.map((k) => {
                    const isEditingThisKey =
                      editingKeyTarget?.providerId === provider.providerId &&
                      editingKeyTarget?.keyId === k.keyId;

                    return (
                      <div key={k.keyId} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            {/* Key Toggle Switch */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={k.isEnabled}
                              aria-label={`Activer la clé ${k.maskedKey}`}
                              onClick={() =>
                                toggleFreeApiKey(provider.providerId, k.keyId)
                              }
                              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                                k.isEnabled && k.isHealthy
                                  ? 'bg-[#252830] border-emerald-400/40'
                                  : 'bg-[#17191E] border-white/10 opacity-50'
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full transition-transform ${
                                  k.isEnabled && k.isHealthy
                                    ? 'translate-x-4 bg-emerald-400'
                                    : 'translate-x-1 bg-slate-500'
                                }`}
                              />
                            </button>

                            {/* Real Status Dot */}
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                k.statusText === 'vérification'
                                  ? 'bg-amber-400'
                                  : k.isHealthy
                                    ? 'bg-emerald-400'
                                    : 'bg-red-400'
                              }`}
                            />

                            {/* Masked Key */}
                            <span className="font-mono text-xs font-semibold text-white tracking-wider">
                              {k.maskedKey}
                            </span>

                            {/* Modifier la clé */}
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEditKey(
                                  provider.providerId,
                                  k.keyId,
                                  k.rawKey
                                )
                              }
                              className="text-xs font-medium text-slate-400 hover:text-white underline-offset-2 hover:underline transition-colors"
                            >
                              Modifier la clé
                            </button>

                            {/* Honest Status text ('sain' | 'vérification' | 'erreur') */}
                            <span
                              className={`text-xs font-semibold ${
                                k.statusText === 'vérification'
                                  ? 'text-amber-300'
                                  : k.isHealthy
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {k.statusText}
                            </span>
                          </div>

                          {/* Right Side: Timestamp + Ping / Delete */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs text-slate-400 tabular-nums">
                              {k.checkedAtTime}
                            </span>

                            <button
                              type="button"
                              disabled={
                                testingKeyId === k.keyId ||
                                k.statusText === 'vérification'
                              }
                              onClick={() =>
                                handlePingKey(provider.providerId, k.keyId)
                              }
                              title="Vérifier réellement cette clé via requête HTTP vers le fournisseur"
                              className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-[10px] font-medium text-slate-300 disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${
                                  testingKeyId === k.keyId ||
                                  k.statusText === 'vérification'
                                    ? 'animate-spin'
                                    : ''
                                }`}
                              />
                              <span>Tester</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteFreeApiKey(provider.providerId, k.keyId)
                              }
                              aria-label={`Supprimer la clé ${k.maskedKey}`}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Real HTTP Error Line */}
                        {k.lastError && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 pl-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F87171]">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#F87171]" />
                              <span>{k.lastError}</span>
                            </div>
                          </div>
                        )}

                        {/* Inline Edit Form for this key */}
                        {isEditingThisKey && (
                          <form
                            onSubmit={handleSaveKey}
                            className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2"
                          >
                            <input
                              type="text"
                              value={keyInputValue}
                              onChange={(e) => setKeyInputValue(e.target.value)}
                              placeholder={`Vraie clé API ${provider.name}...`}
                              aria-label={`Modifier la clé ${provider.name}`}
                              className="flex-1 min-w-0 rounded-lg bg-[#0D0F12] border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 whitespace-nowrap"
                              >
                                Tester & Enregistrer
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingKeyTarget(null)}
                                className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] text-slate-300"
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}

                  {/* Add a new key to this provider */}
                  {editingKeyTarget?.providerId === provider.providerId &&
                  !editingKeyTarget.keyId ? (
                    <form
                      onSubmit={handleSaveKey}
                      className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        value={keyInputValue}
                        onChange={(e) => setKeyInputValue(e.target.value)}
                        placeholder={`Collez votre vraie clé API ${provider.name}...`}
                        aria-label={`Nouvelle clé pour ${provider.name}`}
                        className="flex-1 min-w-0 rounded-lg bg-[#0D0F12] border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="submit"
                          disabled={savingProviderId === provider.providerId}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 whitespace-nowrap disabled:opacity-50"
                        >
                          {savingProviderId === provider.providerId && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          <span>Vérifier & Ajouter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKeyTarget(null)}
                          className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] text-slate-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : provider.keys.length > 0 ? (
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditKey(provider.providerId)}
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span>+ Ajouter une autre clé</span>
                        </button>
                        <span className="text-slate-600">·</span>
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
                        >
                          <span>Obtenir une clé officielle</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {agent && healthyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectProviderForAgent(provider)}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white"
                        >
                          <Sparkles className="h-3 w-3 text-emerald-400" />
                          <span>
                            {isSelectedByAgent
                              ? 'Moteur actif sur cet agent'
                              : `Propulser ${agent.name} avec ${provider.name}`}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

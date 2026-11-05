'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shuffle,
  Loader2,
  Sparkles,
  ArrowLeft,
  Cpu,
  ShieldCheck,
  Wand2,
  Check,
} from 'lucide-react';
import {
  AGENT_TEMPLATE_PRESETS,
  buildDiceBearAvatarUrl,
  TOOL_CATALOG,
} from '@/lib/orbit-logic';
import {
  AgentAutonomyLevel,
  AgentModelId,
  AgentOutputFormat,
  AgentTemplatePreset,
  AgentTone,
} from '@/lib/types';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';

export default function CreateAgentPage() {
  const router = useRouter();
  const { createAgent, locale, t } = useOrbit();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<string>('mickey-agent-seed');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [model, setModel] = useState<AgentModelId>('gemini-3-flash-preview');
  const [tone, setTone] = useState<AgentTone>('executive');
  const [outputFormat, setOutputFormat] = useState<AgentOutputFormat>('bullets');
  const [autonomyLevel, setAutonomyLevel] = useState<AgentAutonomyLevel>('copilot');
  const [selectedTools, setSelectedTools] = useState<string[]>(['gmail', 'slack']);
  const [memoryNotes, setMemoryNotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const avatarUrl = buildDiceBearAvatarUrl(avatarSeed);

  const handleApplyTemplate = (tpl: AgentTemplatePreset) => {
    setSelectedTemplateId(tpl.templateId);
    setName(tpl.name);
    setDescription(`${tpl.description}\n\nInstructions : ${tpl.systemInstructions}`);
    setAvatarSeed(tpl.avatarSeed);
    setModel(tpl.model);
    setTone(tpl.tone);
    setOutputFormat(tpl.outputFormat);
    setAutonomyLevel(tpl.autonomyLevel);
    setSelectedTools(tpl.tools);
    setMemoryNotes(tpl.defaultMemory);
    if (errorMsg) setErrorMsg('');
  };

  const handleToggleTool = (slug: string) => {
    setSelectedTools((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug].slice(0, 10)
    );
  };

  const handleShuffleAvatar = () => {
    const nextSeed =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setAvatarSeed(nextSeed);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(t.createAgent.errorNameRequired);
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    try {
      const created = await createAgent({
        name: name.trim(),
        description: description.trim(),
        avatarSeed,
        tools: selectedTools,
        model,
        tone,
        outputFormat,
        autonomyLevel,
        memoryNotes,
      });
      router.push(`/workspace/${created.agentId}`);
    } catch (error) {
      console.error('Error creating agent:', error);
      setErrorMsg(t.createAgent.errorNameRequired);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto py-4 px-3.5 sm:py-8 sm:px-6 bg-slate-50/40 flex items-start justify-center">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {t.createAgent.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.createAgent.subtitle}
            </p>
          </div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t.createAgent.back}</span>
          </Link>
        </div>

        {/* 4. 1-Click Agent Templates Gallery */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wand2 className="h-4 w-4 text-slate-900" />
              <h2 className="text-xs font-bold text-slate-900">
                {locale === 'fr'
                  ? 'Galerie de Templates d’Agents Prêts à l’Emploi (1-Clic)'
                  : locale === 'it'
                    ? 'Galleria Template Agenti Pronti all’Uso (1-Clic)'
                    : '1-Click Ready-to-Use Agent Templates Gallery'}
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              {locale === 'fr'
                ? 'Pré-configure le rôle, le modèle Gemini, le ton et les outils'
                : 'Pre-configures role, Gemini model, tone & tools'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {AGENT_TEMPLATE_PRESETS.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.templateId;
              return (
                <button
                  key={tpl.templateId}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className={`text-left rounded-xl border p-3 transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/15 text-white'
                            : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        {tpl.badge}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-xs font-bold leading-snug">{tpl.name}</p>
                    <p
                      className={`text-[11px] line-clamp-3 leading-relaxed ${
                        isSelected ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {tpl.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 text-[10px] font-mono">
                    <span>
                      {tpl.model === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : 'Gemini 3 Flash'}
                    </span>
                    <span>{tpl.tools.length} outils</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleCreateAgent} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Identity & System Prompt */}
            <div className="space-y-4">
              {/* Avatar Shuffler */}
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="relative h-16 w-16 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0">
                  <Image
                    src={avatarUrl}
                    alt="Agent Avatar Preview"
                    fill
                    sizes="64px"
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-900">
                    {t.createAgent.avatarTitle}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t.createAgent.avatarDesc}
                  </p>
                  <button
                    type="button"
                    onClick={handleShuffleAvatar}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <Shuffle className="h-3 w-3" />
                    <span>{t.createAgent.shuffleBtn}</span>
                  </button>
                </div>
              </div>

              {/* Agent Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-agent-name"
                  className="block text-xs font-bold text-slate-900"
                >
                  {t.createAgent.nameLabel} <span className="text-red-600">*</span>
                </label>
                <input
                  id="create-agent-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={t.createAgent.namePlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Instructions / System Prompt */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-agent-description"
                  className="block text-xs font-bold text-slate-900"
                >
                  {t.createAgent.descLabel} (System Prompt)
                </label>
                <textarea
                  id="create-agent-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.createAgent.descPlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 leading-relaxed"
                />
              </div>
            </div>

            {/* Right Column: Model, Personality, Autonomy & Pre-connected Tools */}
            <div className="space-y-4">
              {/* 2. AI Model Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-slate-800" />
                  <label className="text-xs font-bold text-slate-900">
                    Modèle IA & Personnalité
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3-flash-preview')}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      model === 'gemini-3-flash-preview'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold">Gemini 3 Flash</p>
                    <p
                      className={`text-[10px] ${
                        model === 'gemini-3-flash-preview' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Ultra-rapide · Routines & Slack
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3.1-pro-preview')}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      model === 'gemini-3.1-pro-preview'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold">Gemini 3.1 Pro</p>
                    <p
                      className={`text-[10px] ${
                        model === 'gemini-3.1-pro-preview' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Raisonnement profond · Code & RAG
                    </p>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label
                      htmlFor="create-agent-tone"
                      className="block text-[11px] font-semibold text-slate-700 mb-1"
                    >
                      Ton de réponse
                    </label>
                    <select
                      id="create-agent-tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value as AgentTone)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    >
                      <option value="executive">Exécutif / Concis</option>
                      <option value="analytical">Analytique / Détaillé</option>
                      <option value="technical">Technique / Développeur</option>
                      <option value="commercial">Commercial / Client</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="create-agent-format"
                      className="block text-[11px] font-semibold text-slate-700 mb-1"
                    >
                      Format de sortie
                    </label>
                    <select
                      id="create-agent-format"
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value as AgentOutputFormat)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    >
                      <option value="bullets">Points clés (Bullets)</option>
                      <option value="markdown_report">Rapport structuré</option>
                      <option value="table">Tableau comparatif</option>
                      <option value="concise">Synthèse courte</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Autonomy Level & Human-in-the-Loop */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-800" />
                  <span className="text-xs font-bold text-slate-900">
                    Niveau d’Autonomie (Human-in-the-Loop)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'copilot', label: 'Mode Copilote', sub: 'Approbation requise' },
                      { id: 'semi_auto', label: 'Semi-Autonome', sub: 'Lecture auto' },
                      { id: 'full_auto', label: '100% Autonome', sub: 'Exécution directe' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAutonomyLevel(item.id)}
                      className={`rounded-lg border p-2 text-left transition-colors ${
                        autonomyLevel === item.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-[11px] font-bold truncate">{item.label}</p>
                      <p
                        className={`text-[10px] truncate ${
                          autonomyLevel === item.id ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pre-connected Tools Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Outils connectés au démarrage ({selectedTools.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TOOL_CATALOG.map((tool) => {
                    const active = selectedTools.includes(tool.slug);
                    return (
                      <button
                        key={tool.slug}
                        type="button"
                        onClick={() => handleToggleTool(tool.slug)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ToolIcon slug={tool.slug} className="h-3 w-3" />
                        <span>{tool.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {errorMsg}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Link
              href="/workspace"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t.createAgent.cancel}
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t.createAgent.creating}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t.createAgent.submit}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


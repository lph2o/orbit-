'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shuffle, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { buildDiceBearAvatarUrl } from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';

export default function CreateAgentPage() {
  const router = useRouter();
  const { createAgent, t } = useOrbit();

  const [avatarSeed, setAvatarSeed] = useState<string>('mickey-agent-seed');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const avatarUrl = buildDiceBearAvatarUrl(avatarSeed);

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
      });
      router.push(`/workspace/${created.agentId}`);
    } catch (error) {
      console.error('Error creating agent:', error);
      setErrorMsg(t.createAgent.errorNameRequired);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-6 bg-slate-50/40">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
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

        <form onSubmit={handleCreateAgent} className="space-y-4" noValidate>
          {/* Avatar Shuffler */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0">
              <Image
                src={avatarUrl}
                alt="Agent Avatar Preview"
                fill
                sizes="80px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-900">
                {t.createAgent.avatarTitle}
              </p>
              <p className="text-xs text-slate-500">
                {t.createAgent.avatarDesc}
              </p>
              <button
                type="button"
                onClick={handleShuffleAvatar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Shuffle className="h-3.5 w-3.5" />
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

          {/* Instructions / Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="create-agent-description"
              className="block text-xs font-bold text-slate-900"
            >
              {t.createAgent.descLabel}
            </label>
            <textarea
              id="create-agent-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.createAgent.descPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 leading-relaxed"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {errorMsg}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
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

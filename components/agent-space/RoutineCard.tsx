'use client';

import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Globe, Sparkles } from 'lucide-react';
import { RoutineDraft, ToolSuggestionItem } from '@/lib/types';
import { formatTimeDisplay, mapToolSlugsToSuggestions } from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';
import { ToolSuggestionCard } from './ToolSuggestionCard';

const ALL_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function RoutineCard({
  agentId,
  routine,
  suggestedTools,
  editingRoutineId,
  onRoutineSaved,
}: {
  agentId: string;
  routine: RoutineDraft;
  suggestedTools?: ToolSuggestionItem[];
  editingRoutineId?: string;
  onRoutineSaved?: () => void;
}) {
  const { agents, routinesByAgent, createOrUpdateRoutine, locale, t } = useOrbit();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const agent = agents.find((a) => a.agentId === agentId);
  const existingRoutines = routinesByAgent[agentId] || [];
  const isEditing = Boolean(editingRoutineId || routine.routineId);

  const requiredSlugs = routine.tools || [];
  const missingTools = requiredSlugs.filter(
    (slug) => !agent?.tools.includes(slug.toLowerCase())
  );

  const toolItems =
    suggestedTools && suggestedTools.length > 0
      ? suggestedTools
      : mapToolSlugsToSuggestions(requiredSlugs, agent?.tools || [], undefined, locale);

  const alreadyExists =
    !isEditing &&
    existingRoutines.some(
      (r) =>
        r.name.toLowerCase() === routine.name.toLowerCase() &&
        r.time === routine.time
    );

  const handleSaveRoutine = async () => {
    setSaving(true);
    await createOrUpdateRoutine(agentId, {
      ...routine,
      routineId: editingRoutineId || routine.routineId,
    });
    setSaving(false);
    setSaved(true);
    onRoutineSaved?.();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5 text-slate-700" />
            <span>
              {isEditing ? t.routineCard.updateHeader : t.routineCard.proposalHeader}
            </span>
            <span>·</span>
            <span className="capitalize font-medium text-slate-700">
              {routine.frequency}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 mt-1">{routine.name}</h4>
          <p className="text-xs text-slate-600 mt-0.5">{routine.goal}</p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-700 font-semibold whitespace-nowrap">
          {formatTimeDisplay(routine.time)}
        </span>
      </div>

      {/* Routine Instructions */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold text-slate-500">
          {t.routineCard.instructionsLabel}
        </p>
        <p className="text-xs text-slate-800 mt-1 leading-relaxed">
          {routine.instructions}
        </p>
      </div>

      {/* Schedule Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] text-slate-500">{t.routineCard.cadence}</p>
          <p className="font-semibold text-slate-900 mt-0.5 capitalize">
            {routine.frequency}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] text-slate-500">{t.routineCard.scheduledTime}</p>
          <p className="font-semibold text-slate-900 mt-0.5 font-mono tabular-nums flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500" />
            <span>{formatTimeDisplay(routine.time)}</span>
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] text-slate-500">{t.routineCard.timezone}</p>
          <p className="font-semibold text-slate-900 mt-0.5 truncate flex items-center gap-1">
            <Globe className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate">{routine.timezone}</span>
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] text-slate-500">{t.routineCard.targetChannel}</p>
          <p className="font-semibold text-slate-900 mt-0.5 font-mono truncate">
            {routine.targetChannel || '#new-channel'}
          </p>
        </div>
      </div>

      {/* Active Days */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
          {t.routineCard.scheduledDays}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_WEEKDAYS.map((day) => {
            const active = routine.days?.includes(day);
            return (
              <span
                key={day}
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  active
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>

      {/* Required Tools */}
      {toolItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-500">
            {t.routineCard.requiredTools} ({toolItems.length})
          </p>
          <div className="space-y-2">
            {toolItems.map((tool) => (
              <ToolSuggestionCard
                key={tool.slug}
                agentId={agentId}
                tool={tool}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-1 flex items-center justify-between gap-3">
        {missingTools.length > 0 ? (
          <p className="text-xs text-amber-700 font-medium">
            {t.routineCard.connectToolsWarning} ({missingTools.join(', ')})
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {t.routineCard.allToolsReady}
          </p>
        )}

        {saved || alreadyExists ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 whitespace-nowrap">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {isEditing ? t.routineCard.updatedBadge : t.routineCard.createdBadge}
            </span>
          </span>
        ) : (
          <button
            type="button"
            disabled={missingTools.length > 0 || saving}
            onClick={handleSaveRoutine}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {saving
                ? t.routineCard.savingBtn
                : isEditing
                  ? t.routineCard.updateBtn
                  : t.routineCard.createBtn}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { computeNextRunAt, simulateRoutineExecutionSteps } from '@/lib/orbit-logic';
import { Locale } from '@/lib/i18n';
import { AgentConfig, AgentRoutine, RoutineExecution } from '@/lib/types';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      routine,
      agent,
      triggerType = 'manual',
      locale = 'fr',
    }: {
      routine: AgentRoutine;
      agent: AgentConfig;
      triggerType?: 'manual' | 'scheduled';
      locale?: Locale;
    } = body;

    if (!routine || !agent) {
      return NextResponse.json(
        { error: 'Missing routine or agent configuration for Inngest execution.' },
        { status: 400 }
      );
    }

    const startedAt = new Date().toISOString();
    const { steps, summary: defaultSummary } = simulateRoutineExecutionSteps(routine, agent, locale);

    let finalSummary = defaultSummary;
    const ai = getGenAIClient();
    if (ai) {
      try {
        const langName =
          locale === 'fr' ? 'French (Français)' : locale === 'it' ? 'Italian (Italiano)' : 'English';
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Execute this scheduled agent routine and generate a realistic, concise 2-sentence execution digest in ${langName}.
Agent: ${agent.name}
Routine Name: ${routine.name}
Routine Goal: ${routine.goal}
Routine Instructions: ${routine.instructions}
Connected Tools: ${routine.tools.join(', ') || 'Cloud VM Browser'}
Target Channel: ${routine.targetChannel || '#new-channel'}`,
        });
        const text = (geminiRes.text ?? '').trim();
        if (text.length > 20) {
          finalSummary = text;
        }
      } catch {
        // Keep deterministic summary if Gemini call times out
      }
    }

    const completedAt = new Date().toISOString();

    const execution: RoutineExecution = {
      executionId: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      routineId: routine.routineId,
      routineName: routine.name,
      agentId: agent.agentId,
      ownerId: agent.ownerId,
      status: 'completed',
      triggerType,
      summary: finalSummary,
      stepsLog: steps,
      startedAt,
      completedAt,
      createdAt: completedAt,
    };

    const nextRunAt = computeNextRunAt(routine.frequency, routine.time, routine.days, new Date());

    const notifPrefix =
      locale === 'fr'
        ? `Routine **${routine.name}** (${triggerType === 'manual' ? 'exécution manuelle' : 'exécution planifiée'}) terminée :`
        : locale === 'it'
          ? `Routine **${routine.name}** (${triggerType === 'manual' ? 'esecuzione manuale' : 'esecuzione pianificata'}) completata:`
          : `Routine **${routine.name}** (${triggerType} run) completed:`;

    return NextResponse.json({
      execution,
      nextRunAt,
      lastRunAt: completedAt,
      chatNotification: `${notifPrefix}\n\n${finalSummary}`,
    });
  } catch (error) {
    console.error('Inngest routine execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute routine background job.' },
      { status: 500 }
    );
  }
}

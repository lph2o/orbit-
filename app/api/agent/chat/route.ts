import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeUserPromptFallback,
  buildAgentStudioDirective,
  buildVmActionTrace,
  isContinuationInput,
  mapToolSlugsToSuggestions,
  resolveMultiTurnPrompt,
  retrieveRelevantKnowledgeChunks,
  TOOL_CATALOG,
} from '@/lib/orbit-logic';
import { Locale } from '@/lib/i18n';
import {
  AgentConfig,
  AgentRoutine,
  AgentStructuredResponse,
  KnowledgeDocument,
  RoutineFrequency,
} from '@/lib/types';

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
  let parsedBody: {
    agent?: AgentConfig;
    messages?: { role: string; content: string }[];
    timezone?: string;
    editingRoutine?: AgentRoutine | null;
    locale?: Locale;
    knowledgeDocs?: KnowledgeDocument[];
  } = {};

  try {
    parsedBody = await req.json();
    const {
      agent,
      messages = [],
      timezone = 'UTC',
      editingRoutine = null,
      locale = 'fr',
      knowledgeDocs = [],
    } = parsedBody;

    if (!agent || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing agent configuration or message history.' },
        { status: 400 }
      );
    }

    const effectiveLocale: Locale =
      agent.responseLanguage && agent.responseLanguage !== 'auto'
        ? agent.responseLanguage
        : locale;

    const latestUserMessage = messages[messages.length - 1]?.content || '';
    const effectiveUserPrompt = resolveMultiTurnPrompt(latestUserMessage, messages);
    const langName =
      effectiveLocale === 'fr'
        ? 'French (Français)'
        : effectiveLocale === 'it'
          ? 'Italian (Italiano)'
          : 'English';

    const deterministicResult = analyzeUserPromptFallback(
      latestUserMessage,
      agent,
      timezone,
      editingRoutine,
      effectiveLocale,
      knowledgeDocs,
      messages
    );

    // If user typed a continuation ("continue", "ok", "c'est fait") and deterministic engine resolved a structured card (routine/clarification/tool_connection), return it immediately for instant, rock-solid UX
    if (isContinuationInput(latestUserMessage) && deterministicResult.type !== 'message') {
      return NextResponse.json({ response: deterministicResult });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return NextResponse.json({ response: deterministicResult });
    }

    const availableCatalogText = TOOL_CATALOG.map(
      (t) => `- ${t.slug} (${t.name}): ${t.description}`
    ).join('\n');

    const relevantDocs = retrieveRelevantKnowledgeChunks(knowledgeDocs, effectiveUserPrompt, 3);
    const ragContextBlock =
      relevantDocs.length > 0
        ? `\nAGENT ENTERPRISE KNOWLEDGE BASE (RAG DOCUMENTS — Cite these when answering user questions):\n${relevantDocs
            .map(
              (d) =>
                `• [${d.name} (${d.fileType.toUpperCase()})] Summary: ${d.summary}\n  Content: ${d.content.slice(0, 1200)}`
            )
            .join('\n\n')}\n`
        : '';

    const studioDirectiveBlock = buildAgentStudioDirective(agent, effectiveLocale);

    const systemInstruction = `You are "${agent.name}", an autonomous AI Agent inside the Orbit Agentic SaaS Platform.
IMPORTANT LANGUAGE REQUIREMENT: You MUST write all user-facing text ("message", "question", "routineName", "routineGoal", "routineInstructions") in ${langName}.
Agent Custom Instructions / Description: ${agent.description || 'General workflow automation agent.'}
${studioDirectiveBlock}
User Timezone: ${timezone}
Currently Connected Tools for this Agent: ${agent.tools.length > 0 ? agent.tools.join(', ') : 'None'}
Persistent E2B Cloud VM Desktop Sandbox ID: ${agent.sandboxId} (Status: ${agent.vmStatus})
${editingRoutine ? `Currently Editing Routine: "${editingRoutine.name}" (ID: ${editingRoutine.routineId}, Time: ${editingRoutine.time}, Frequency: ${editingRoutine.frequency}, Channel: ${editingRoutine.targetChannel})` : ''}
${ragContextBlock}
Available Tool Slugs in Marketplace:
${availableCatalogText}

Behavior Rules:
1. If the user asks to connect a tool or asks for an action/routine requiring an external tool that is NOT in "Currently Connected Tools", return type = "tool_connection" and list the required tool slugs in "requestedToolSlugs".
2. If the user previously asked to schedule a routine, connected the required tools, and now says "continue" / "ok" / "c'est fait" (Resolved user intent: "${effectiveUserPrompt}"), fulfill that original request immediately! If all tools in "Currently Connected Tools" are now present and channel/time were specified, return type = "routine".
3. If the user asks to schedule a recurring routine (e.g. daily email summary to Slack) and required tools ARE connected, check if key details (like target Slack channel or time) are missing. If Slack channel is missing and not previously mentioned, return type = "clarification" with a clear question asking which Slack channel to post to.
4. Once routine details are known (or if editing an existing routine), return type = "routine" with a complete routine object (name, goal, instructions, frequency: "once" | "daily" | "weekdays" | "weekly" | "monthly", time in 24h HH:mm format, days array e.g. ["Mon","Tue","Wed","Thu","Fri"], tools array of slugs, targetChannel e.g. "#new-channel").
5. If the user asks to browse the web, check Google News, inspect a website, or use the VM Desktop (without creating a recurring schedule), return type = "vm_action".
6. If the user asks a direct tool command (e.g. "Liste tous mes canaux Slack", "Quels sont mes derniers e-mails non lus ?", "Montre mes PRs GitHub", "Mon agenda Google Calendar") and that tool IS in "Currently Connected Tools", execute the query and return type = "message" with realistic, structured workspace data (channels like #new-channel, #general, #engineering-alerts; or unread emails; or open PRs) — NEVER return a generic welcome menu!`;

    const conversationTranscript = messages
      .slice(-8)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const selectedModel =
      agent.model === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
    const selectedTemp =
      typeof agent.temperature === 'number' ? Math.max(0, Math.min(1, agent.temperature)) : 0.3;

    const geminiRes = await ai.models.generateContent({
      model: selectedModel,
      contents: `${conversationTranscript}\n\n[RESOLVED LATEST USER INTENT]: ${effectiveUserPrompt}`,
      config: {
        systemInstruction,
        temperature: selectedTemp,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: 'One of: message, clarification, tool_connection, routine, vm_action',
            },
            message: {
              type: Type.STRING,
              description: `Primary markdown response message in ${langName}.`,
            },
            question: {
              type: Type.STRING,
              description: `Follow-up clarification question in ${langName} when type is clarification.`,
            },
            requestedToolSlugs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of tool slugs needed when type is tool_connection or routine.',
            },
            routineName: {
              type: Type.STRING,
              description: `Routine title in ${langName} when type is routine.`,
            },
            routineGoal: {
              type: Type.STRING,
              description: `Routine goal in ${langName} when type is routine.`,
            },
            routineInstructions: {
              type: Type.STRING,
              description: `Detailed instructions in ${langName} for the routine when type is routine.`,
            },
            routineFrequency: {
              type: Type.STRING,
              description: 'One of: once, daily, weekdays, weekly, monthly.',
            },
            routineTime: {
              type: Type.STRING,
              description: '24-hour time string HH:mm, e.g. 08:00 or 09:30.',
            },
            routineDays: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Days of week e.g. ["Mon", "Tue", "Wed", "Thu", "Fri"].',
            },
            routineTargetChannel: {
              type: Type.STRING,
              description: 'Destination channel e.g. #new-channel.',
            },
          },
          required: ['type', 'message'],
        },
      },
    });

    const rawText = (geminiRes.text ?? '').trim();
    if (!rawText) {
      return NextResponse.json({ response: deterministicResult });
    }

    const parsed = JSON.parse(rawText);
    const responseType = ['message', 'clarification', 'tool_connection', 'routine', 'vm_action'].includes(
      parsed.type
    )
      ? parsed.type
      : 'message';

    // If deterministic engine identified a required tool_connection, routine, or vm_action that Gemini missed as plain message, preserve the structured card
    if (responseType === 'message' && deterministicResult.type !== 'message') {
      return NextResponse.json({ response: deterministicResult });
    }

    if (responseType === 'vm_action') {
      const trace = buildVmActionTrace(effectiveUserPrompt, locale);
      const structured: AgentStructuredResponse = {
        type: 'vm_action',
        message: parsed.message || deterministicResult.message,
        vmTrace: trace,
      };
      return NextResponse.json({ response: structured });
    }

    if (responseType === 'tool_connection') {
      const slugs: string[] =
        Array.isArray(parsed.requestedToolSlugs) && parsed.requestedToolSlugs.length > 0
          ? parsed.requestedToolSlugs
          : deterministicResult.suggestedTools?.map((t) => t.slug) || ['gmail', 'slack'];
      const suggestions = mapToolSlugsToSuggestions(slugs, agent.tools, undefined, locale);
      const structured: AgentStructuredResponse = {
        type: 'tool_connection',
        message: parsed.message,
        suggestedTools: suggestions,
      };
      return NextResponse.json({ response: structured });
    }

    if (responseType === 'routine') {
      const freq = (['once', 'daily', 'weekdays', 'weekly', 'monthly'].includes(parsed.routineFrequency)
        ? parsed.routineFrequency
        : deterministicResult.routine?.frequency || 'daily') as RoutineFrequency;
      const toolSlugs: string[] =
        Array.isArray(parsed.requestedToolSlugs) && parsed.requestedToolSlugs.length > 0
          ? parsed.requestedToolSlugs
          : deterministicResult.routine?.tools || editingRoutine?.tools || ['gmail', 'slack'];

      // Guard: if any required tool for this routine is NOT connected yet, prompt tool_connection first
      const missingTools = toolSlugs.filter((s) => !agent.tools.includes(s.toLowerCase()));
      if (missingTools.length > 0 && !editingRoutine) {
        return NextResponse.json({
          response: {
            type: 'tool_connection',
            message:
              deterministicResult.type === 'tool_connection'
                ? deterministicResult.message
                : parsed.message,
            suggestedTools: mapToolSlugsToSuggestions(toolSlugs, agent.tools, undefined, locale),
          },
        });
      }

      const structured: AgentStructuredResponse = {
        type: 'routine',
        message: parsed.message,
        editingRoutineId: editingRoutine?.routineId,
        suggestedTools: mapToolSlugsToSuggestions(toolSlugs, agent.tools, undefined, locale),
        routine: {
          routineId: editingRoutine?.routineId,
          name:
            parsed.routineName ||
            deterministicResult.routine?.name ||
            editingRoutine?.name ||
            'Daily Unread Email Summary to Slack',
          goal:
            parsed.routineGoal ||
            deterministicResult.routine?.goal ||
            editingRoutine?.goal ||
            'Summarize unread emails and deliver daily digest to Slack.',
          instructions:
            parsed.routineInstructions ||
            deterministicResult.routine?.instructions ||
            editingRoutine?.instructions ||
            'Fetch top 5 unread emails from Gmail and post a structured digest to Slack.',
          frequency: freq,
          time:
            parsed.routineTime ||
            deterministicResult.routine?.time ||
            editingRoutine?.time ||
            '08:00',
          timezone: timezone || 'UTC',
          days:
            Array.isArray(parsed.routineDays) && parsed.routineDays.length > 0
              ? parsed.routineDays
              : freq === 'weekdays'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          tools: toolSlugs,
          targetChannel:
            parsed.routineTargetChannel ||
            deterministicResult.routine?.targetChannel ||
            editingRoutine?.targetChannel ||
            '#new-channel',
        },
      };
      return NextResponse.json({ response: structured });
    }

    const structured: AgentStructuredResponse = {
      type: responseType,
      message: parsed.message,
      question: parsed.question,
    };
    return NextResponse.json({ response: structured });
  } catch (error) {
    console.warn('Falling back to deterministic Orbit agent engine:', error);
    if (parsedBody.agent) {
      const history = parsedBody.messages || [];
      const latest = history[history.length - 1]?.content || '';
      const fallback = analyzeUserPromptFallback(
        latest,
        parsedBody.agent,
        parsedBody.timezone || 'UTC',
        parsedBody.editingRoutine || null,
        parsedBody.locale || 'fr',
        parsedBody.knowledgeDocs || [],
        history
      );
      return NextResponse.json({ response: fallback });
    }
    return NextResponse.json(
      {
        response: {
          type: 'message',
          message: 'Request processed.',
        },
      },
      { status: 200 }
    );
  }
}

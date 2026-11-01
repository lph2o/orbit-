import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeUserPromptFallback,
  buildAgentStudioDirective,
  buildVmActionTrace,
  detectDirectToolActionIntent,
  evaluateToolConnectionReadiness,
  extractRequestedPageTitle,
  getToolCredentialSpec,
  isContinuationInput,
  isNotionPageCreationIntent,
  mapToolSlugsToSuggestions,
  resolveMultiTurnPrompt,
  retrieveRelevantKnowledgeChunks,
  sanitizeHallucinatedUrls,
  TOOL_CATALOG,
  ToolCredentialRecord,
} from '@/lib/orbit-logic';
import {
  createLiveGoogleDoc,
  createLiveNotionPage,
  executeLiveToolAction,
  postToSlackWebhook,
} from '@/lib/workspace-server';
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
    notionToken?: string;
    notionParentId?: string;
    toolCredentials?: Record<string, ToolCredentialRecord>;
    workspaceToken?: string | null;
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
      notionToken = '',
      notionParentId = '',
      toolCredentials = {},
      workspaceToken = null,
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
    const publicPortfolioPath = `/portfolio/${encodeURIComponent(agent.agentId)}`;
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

    const effectiveNotionToken = (
      notionToken ||
      toolCredentials.notion?.apiToken ||
      ''
    ).trim();
    const effectiveNotionParent = (
      notionParentId ||
      toolCredentials.notion?.targetParam ||
      ''
    ).trim();

    // 1. Real Notion API execution & anti-hallucination guard when user asks to create a Notion/portfolio page or asks for its public link
    if (isNotionPageCreationIntent(effectiveUserPrompt, messages)) {
      const portfolioTitle = extractRequestedPageTitle(effectiveUserPrompt, agent.name);

      if (effectiveNotionToken) {
        try {
          const portfolioContent = [
            `## À propos — ${agent.name}`,
            agent.description ||
              `Portfolio professionnel généré et maintenu par l'agent autonome ${agent.name} sur Orbit AI.`,
            `## Projets & Réalisations Clés`,
            `• Architecture Multi-Agents & Automatisation MCP (${agent.tools.length} outils connectés : ${agent.tools.join(', ') || 'Orbit Core'})`,
            `• Orchestration Cloud VM Desktop E2B & Inspection DOM en temps réel`,
            `• Pipelines RAG Documentaires & Exécutions Durables Inngest`,
            `## Compétences & Stack Technique`,
            `• TypeScript, Next.js 15, Google Gemini API, Notion API v1, OAuth 2.0, Cloud VM Linux`,
            `## Contact & Lien Public`,
            `• Page publique Orbit : ${publicPortfolioPath}`,
          ].join('\n');

          const createdPage = await createLiveNotionPage({
            notionToken: effectiveNotionToken,
            parentId: effectiveNotionParent,
            title: portfolioTitle,
            content: portfolioContent,
          });

          const verifiedMessage =
            effectiveLocale === 'fr'
              ? `✅ **Votre page Notion a été réellement créée via l'API officielle Notion (\`POST /v1/pages\`) !**\n\n` +
                `• **Titre de la page** : **${portfolioTitle}**\n` +
                `• **Espace Notion cible** : \`${createdPage.workspaceName || 'Workspace Notion'}\`${createdPage.parentTitle ? ` (sous "${createdPage.parentTitle}")` : ''}\n` +
                `• **Lien Notion réel (vérifié à 100%)** : [${createdPage.url}](${createdPage.url})\n` +
                `• **Lien Portfolio Public hébergé (accessible sans compte Notion)** : [Ouvrir mon Portfolio Public (${publicPortfolioPath})](${publicPortfolioPath})\n\n` +
                `Note : Sur \`notion.so\`, la page est créée dans votre espace privé par défaut. Pour que n'importe qui puisse ouvrir le lien \`notion.so\` hors de votre compte, cliquez sur **Partager (Share) → Publier sur le Web (Publish)** en haut à droite de votre page Notion, ou partagez directement votre [Portfolio Public Orbit (${publicPortfolioPath})](${publicPortfolioPath}) qui est déjà 100% public.`
              : `✅ **Your Notion page was created live via the official Notion API (\`POST /v1/pages\`)!**\n\n` +
                `• **Title**: **${portfolioTitle}**\n` +
                `• **Verified Notion URL**: [${createdPage.url}](${createdPage.url})\n` +
                `• **Hosted Public Portfolio URL**: [Open Public Portfolio (${publicPortfolioPath})](${publicPortfolioPath})`;

          return NextResponse.json({
            response: {
              type: 'message',
              message: verifiedMessage,
            },
          });
        } catch (notionErr) {
          const errMsg =
            notionErr instanceof Error ? notionErr.message : 'Erreur de connexion à api.notion.com';
          const errorResponse: AgentStructuredResponse = {
            type: 'tool_connection',
            message:
              effectiveLocale === 'fr'
                ? `⚠️ **L'API officielle Notion n'a pas pu créer la page sur \`notion.so\`** :\n${errMsg}\n\n` +
                  `✅ **Bonne nouvelle : votre page publique de Portfolio est toutefois déjà générée et 100% accessible ici** :\n` +
                  `• **Lien Public Actif** : [Ouvrir mon Portfolio Public (${publicPortfolioPath})](${publicPortfolioPath})\n` +
                  `• **Sections incluses** : À propos / Bio, Projets & Réalisations, Compétences et Contact\n\n` +
                  `👉 **Pour corriger la synchronisation avec votre compte \`notion.so\`**, vérifiez votre clé \`ntn_...\` et assurez-vous d'avoir partagé au moins une page Notion avec votre intégration (\`...\` en haut à droite d'une page Notion → \`Connexions\`) ci-dessous :`
                : `⚠️ **The official Notion API could not create the page on \`notion.so\`**:\n${errMsg}\n\n` +
                  `✅ **However, your hosted Public Portfolio page is already live and 100% accessible here**:\n` +
                  `• **Working Public Link**: [Open Public Portfolio (${publicPortfolioPath})](${publicPortfolioPath})\n\n` +
                  `👉 **To fix \`notion.so\` sync**, verify your \`ntn_...\` token and share a parent page with your integration below:`,
            suggestedTools: mapToolSlugsToSuggestions(['notion'], agent.tools, undefined, effectiveLocale),
          };
          return NextResponse.json({ response: errorResponse });
        }
      }

      // No Notion API token configured: never let the LLM invent a fake notion.so link!
      const noTokenResponse: AgentStructuredResponse = {
        type: 'tool_connection',
        message:
          effectiveLocale === 'fr'
            ? `⚠️ **Je préfère être 100% transparent avec vous : aucune page n'a été créée sur \`notion.so\`** car aucune **Clé d'intégration API Notion (\`ntn_...\` / \`secret_...\`)** n'est configurée (un lien \`notion.so/...\` généré sans clé API renverrait **"This page couldn't be found"**).\n\n` +
              `✅ **En revanche, j'ai généré votre vraie page publique de Portfolio hébergée directement ici et 100% fonctionnelle** :\n` +
              `• **Nom de la page** : **${portfolioTitle}**\n` +
              `• **Lien public actif (cliquez pour l'ouvrir)** : [Ouvrir mon Portfolio Public (${publicPortfolioPath})](${publicPortfolioPath})\n` +
              `• **Structure prête à l'emploi** : Sections À propos & Bio, Projets & Réalisations, Stack Technique et Contact.\n\n` +
              `👉 **Si vous souhaitez aussi publier cette page dans votre vrai espace Notion (\`notion.so\`)**, renseignez votre clé d'intégration \`ntn_...\` dans la carte **Notion** ci-dessous :`
            : `⚠️ **To be 100% transparent: no page was created on \`notion.so\` yet** because no **Notion Integration Token (\`ntn_...\` / \`secret_...\`)** is configured.\n\n` +
              `✅ **However, I generated your real, working Public Portfolio page hosted right here**:\n` +
              `• **Page Title**: **${portfolioTitle}**\n` +
              `• **Working Public Link**: [Open Public Portfolio (${publicPortfolioPath})](${publicPortfolioPath})\n\n` +
              `👉 **To also publish this page to your personal \`notion.so\` workspace**, enter your \`ntn_...\` API key in the **Notion** card below:`,
        suggestedTools: mapToolSlugsToSuggestions(['notion'], agent.tools, undefined, effectiveLocale),
      };
      return NextResponse.json({ response: noTokenResponse });
    }

    // 2. Universal Write / Action Intent Guard across ALL other tools (Google Docs, Slack, Discord, Linear, ClickUp, Outlook, Gmail, Google Calendar, GitHub)
    const directToolIntent = detectDirectToolActionIntent(effectiveUserPrompt);
    if (directToolIntent && directToolIntent.slug !== 'notion') {
      const targetSlug = directToolIntent.slug;
      const spec = getToolCredentialSpec(targetSlug);
      const isConnectedOnAgent = agent.tools.includes(targetSlug);
      const readiness = evaluateToolConnectionReadiness(
        targetSlug,
        isConnectedOnAgent,
        toolCredentials,
        workspaceToken
      );

      // If it's a write action (e.g. create Google Doc, send Slack/Discord message, create Linear/ClickUp ticket, send Gmail) and credentials are NOT verified yet:
      if (directToolIntent.isWriteAction && !readiness.canExecuteLiveWrite) {
        return NextResponse.json({
          response: {
            type: 'tool_connection',
            message:
              effectiveLocale === 'fr'
                ? `⚠️ **Transparence totale : aucune action externe n'a été exécutée sur votre vrai compte ${spec.name}** (${directToolIntent.actionLabelFr}).\n\n` +
                  `• **Statut actuel de ${spec.name}** : \`${readiness.badgeTextFr}\`\n` +
                  `• **Pourquoi ?** ${spec.helpTextFr}\n\n` +
                  `👉 **Cliquez sur "Vérifier API / OAuth" dans la carte ${spec.name} ci-dessous** pour authentifier votre vrai compte et exécuter cette opération en direct sans aucune mauvaise surprise :`
                : `⚠️ **Full transparency: no external write action was executed on your live ${spec.name} account yet**.\n\n` +
                  `• **Current Status**: \`${readiness.badgeTextFr}\`\n` +
                  `• **Why?** ${spec.helpTextFr}\n\n` +
                  `👉 **Configure & verify your official ${spec.name} API key / OAuth in the card below** to execute this action on your real account:`,
            suggestedTools: mapToolSlugsToSuggestions(
              [targetSlug],
              agent.tools,
              spec.helpTextFr,
              effectiveLocale
            ),
          },
        });
      }

      // If credentials ARE verified, execute the real live action!
      if (directToolIntent.isWriteAction && readiness.canExecuteLiveWrite) {
        try {
          if (targetSlug === 'google_docs') {
            const activeGoogleToken =
              workspaceToken || toolCredentials.google_docs?.apiToken || '';
            const docTitle = extractRequestedPageTitle(effectiveUserPrompt, agent.name);
            const createdDoc = await createLiveGoogleDoc(
              activeGoogleToken,
              docTitle,
              `Document généré en direct par ${agent.name} sur Orbit AI.\n\nRequête : ${effectiveUserPrompt}`
            );
            return NextResponse.json({
              response: {
                type: 'message',
                message:
                  `✅ **Votre document Google Docs a été réellement créé via l'API officielle Google Docs (\`POST /v1/documents\`) !**\n\n` +
                  `• **Titre** : **${createdDoc.title}**\n` +
                  `• **Lien Google Docs vérifié** : [${createdDoc.url}](${createdDoc.url})`,
              },
            });
          }

          if (targetSlug === 'slack' && toolCredentials.slack?.webhookUrl) {
            const slackRes = await postToSlackWebhook(
              toolCredentials.slack.webhookUrl,
              `🚀 *[Orbit Agent · ${agent.name}]* ${effectiveUserPrompt}`
            );
            if (slackRes.delivered) {
              return NextResponse.json({
                response: {
                  type: 'message',
                  message: `✅ **Message réellement publié dans votre workspace Slack via votre Incoming Webhook vérifié (HTTP ${slackRes.status}) !**`,
                },
              });
            }
          }

          const liveExec = await executeLiveToolAction({
            slug: targetSlug,
            agentName: agent.name,
            composioSessionId: agent.composioSessionId,
            locale: effectiveLocale,
            targetParam: toolCredentials[targetSlug]?.targetParam || effectiveUserPrompt,
            apiToken: toolCredentials[targetSlug]?.apiToken,
            webhookUrl: toolCredentials[targetSlug]?.webhookUrl,
            workspaceBearerToken: workspaceToken || undefined,
          });
          return NextResponse.json({
            response: {
              type: 'message',
              message: liveExec.message,
            },
          });
        } catch (liveErr) {
          return NextResponse.json({
            response: {
              type: 'tool_connection',
              message:
                `⚠️ **L'API officielle ${spec.name} a renvoyé une erreur lors de l'exécution en direct** :\n` +
                `${liveErr instanceof Error ? liveErr.message : 'Erreur API'}\n\n` +
                `👉 Vérifiez ou mettez à jour vos identifiants **${spec.name}** ci-dessous :`,
              suggestedTools: mapToolSlugsToSuggestions([targetSlug], agent.tools, undefined, effectiveLocale),
            },
          });
        }
      }
    }

    // If user typed a continuation ("continue", "ok", "c'est fait") and deterministic engine resolved a structured card (routine/clarification/tool_connection), return it immediately for instant, rock-solid UX
    if (isContinuationInput(latestUserMessage) && deterministicResult.type !== 'message') {
      return NextResponse.json({ response: deterministicResult });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return NextResponse.json({ response: deterministicResult });
    }

    const availableCatalogText = TOOL_CATALOG.map((t) => {
      const r = evaluateToolConnectionReadiness(
        t.slug,
        agent.tools.includes(t.slug),
        toolCredentials,
        workspaceToken
      );
      return `- ${t.slug} (${t.name}) [Status: ${r.badgeTextFr}]: ${t.description}`;
    }).join('\n');

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
Notion API Token Configured: ${effectiveNotionToken ? 'YES (Verified)' : 'NO (Demo mode only — cannot create external notion.so URLs)'}
Google Workspace OAuth Token Active: ${workspaceToken ? 'YES (Verified)' : 'NO (Demo mode only — cannot create external Google Docs/Sheets/Calendar events)'}
Hosted Public Portfolio URL for this Agent: ${publicPortfolioPath}
Persistent E2B Cloud VM Desktop Sandbox ID: ${agent.sandboxId} (Status: ${agent.vmStatus})
${editingRoutine ? `Currently Editing Routine: "${editingRoutine.name}" (ID: ${editingRoutine.routineId}, Time: ${editingRoutine.time}, Frequency: ${editingRoutine.frequency}, Channel: ${editingRoutine.targetChannel})` : ''}
${ragContextBlock}
Available Tool Slugs in Marketplace (with real-time verification status):
${availableCatalogText}

Behavior Rules:
1. If the user asks to connect a tool or asks for an action/routine requiring an external tool that is NOT in "Currently Connected Tools", return type = "tool_connection" and list the required tool slugs in "requestedToolSlugs".
2. If the user previously asked to schedule a routine, connected the required tools, and now says "continue" / "ok" / "c'est fait" (Resolved user intent: "${effectiveUserPrompt}"), fulfill that original request immediately! If all tools in "Currently Connected Tools" are now present and channel/time were specified, return type = "routine".
3. If the user asks to schedule a recurring routine (e.g. daily email summary to Slack) and required tools ARE connected, check if key details (like target Slack channel or time) are missing. If Slack channel is missing and not previously mentioned, return type = "clarification" with a clear question asking which Slack channel to post to.
4. Once routine details are known (or if editing an existing routine), return type = "routine" with a complete routine object (name, goal, instructions, frequency: "once" | "daily" | "weekdays" | "weekly" | "monthly", time in 24h HH:mm format, days array e.g. ["Mon","Tue","Wed","Thu","Fri"], tools array of slugs, targetChannel e.g. "#new-channel").
5. If the user asks to browse the web, check Google News, inspect a website, or use the VM Desktop (without creating a recurring schedule), return type = "vm_action".
6. If the user asks a direct tool command (e.g. "Liste tous mes canaux Slack", "Quels sont mes derniers e-mails non lus ?", "Montre mes PRs GitHub", "Mon agenda Google Calendar") and that tool IS in "Currently Connected Tools", if the tool is in "Mode Démo local", clearly state at the top that it is a local Demo Preview unless they configure their API key / OAuth.
7. CRITICAL ANTI-HALLUCINATION RULE ACROSS ALL 12 TOOLS: NEVER invent or fabricate any external URL (never invent notion.so/..., docs.google.com/document/d/..., linear.app/.../issue/..., app.clickup.com/t/..., slack.com/archives/..., or discord.com/channels/...). Never claim a write operation succeeded on an external platform if that tool is in "Mode Démo local".`;

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
    if (typeof parsed.message === 'string') {
      parsed.message = sanitizeHallucinatedUrls(parsed.message, [], publicPortfolioPath);
    }
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

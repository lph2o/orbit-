import { buildRawMimeEmail, buildRichToolResponse } from './orbit-logic';
import { Locale } from './i18n';
import { ToolExecutionResultItem, ToolLiveExecutionReport } from './types';

export interface LiveGmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface LiveCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
}

export interface LiveGitHubItem {
  id: number;
  number: number;
  title: string;
  state: string;
  author: string;
  url: string;
  createdAt: string;
  isPullRequest: boolean;
}

export async function fetchLiveGmailMessages(
  bearerHeaderOrToken: string,
  maxResults = 5
): Promise<LiveGmailMessage[]> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    }
  );

  if (!listRes.ok) {
    throw new Error(`Gmail API returned status ${listRes.status}`);
  }

  const listData = (await listRes.json()) as { messages?: { id: string }[] };
  const messageRefs = listData.messages || [];

  const details = await Promise.all(
    messageRefs.slice(0, maxResults).map(async (msg): Promise<LiveGmailMessage | null> => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: authHeader },
            cache: 'no-store',
          }
        );
        if (!msgRes.ok) return null;
        const msgJson = (await msgRes.json()) as {
          id: string;
          snippet?: string;
          payload?: { headers?: { name: string; value: string }[] };
        };
        const headers = msgJson.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        return {
          id: msgJson.id,
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From') || 'Unknown Sender',
          date: getHeader('Date') || '',
          snippet: (msgJson.snippet || '').slice(0, 260),
        };
      } catch {
        return null;
      }
    })
  );

  return details.filter((item): item is LiveGmailMessage => item !== null);
}

export async function sendLiveGmailEmail(
  bearerHeaderOrToken: string,
  params: { to: string; subject: string; body: string }
): Promise<{ id: string; threadId?: string }> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const raw = buildRawMimeEmail(params);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gmail send failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  return (await res.json()) as { id: string; threadId?: string };
}

export async function createLiveGmailDraft(
  bearerHeaderOrToken: string,
  params: { to: string; subject: string; body: string }
): Promise<{ id: string; message?: { id: string } }> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const raw = buildRawMimeEmail(params);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gmail draft creation failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  return (await res.json()) as { id: string; message?: { id: string } };
}

export async function fetchLiveCalendarEvents(
  bearerHeaderOrToken: string,
  maxResults = 5
): Promise<LiveCalendarEvent[]> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const timeMin = encodeURIComponent(new Date().toISOString());
  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&singleEvents=true&orderBy=startTime&timeMin=${timeMin}`,
    {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    }
  );

  if (!calRes.ok) {
    throw new Error(`Google Calendar API returned status ${calRes.status}`);
  }

  const calData = (await calRes.json()) as {
    items?: {
      id: string;
      summary?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  return (calData.items || []).map((ev) => ({
    id: ev.id,
    summary: ev.summary || '(Untitled Event)',
    start: ev.start?.dateTime || ev.start?.date || '',
    end: ev.end?.dateTime || ev.end?.date || '',
    htmlLink: ev.htmlLink,
  }));
}

export async function createLiveGoogleDoc(
  bearerHeaderOrToken: string,
  title: string,
  bodyContent: string
): Promise<{ documentId: string; title: string; url: string }> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    throw new Error(`Google Docs create failed with status ${createRes.status}`);
  }

  const created = (await createRes.json()) as { documentId: string; title: string };
  const documentId = created.documentId;

  if (bodyContent.trim()) {
    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: `${bodyContent}\n`,
            },
          },
        ],
      }),
    });
  }

  return {
    documentId,
    title: created.title || title,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

export async function createLiveGoogleSheet(
  bearerHeaderOrToken: string,
  title: string,
  rows: string[][]
): Promise<{ spreadsheetId: string; title: string; url: string }> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Google Sheets create failed with status ${createRes.status}`);
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    properties?: { title?: string };
    sheets?: { properties?: { title?: string } }[];
  };
  const spreadsheetId = created.spreadsheetId;
  const firstSheetName = created.sheets?.[0]?.properties?.title || 'Sheet1';

  if (rows.length > 0) {
    const encodedRange = encodeURIComponent(`${firstSheetName}!A1`);
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
  }

  return {
    spreadsheetId,
    title: created.properties?.title || title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export async function postToSlackWebhook(
  webhookUrl: string,
  text: string
): Promise<{ delivered: boolean; status: number }> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl.startsWith('https://hooks.slack.com/')) {
    throw new Error('Invalid Slack Incoming Webhook URL');
  }

  const res = await fetch(cleanUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  return { delivered: res.ok, status: res.status };
}

export async function fetchLiveGitHubRepoActivity(
  repoFullName: string,
  githubToken?: string,
  maxItems = 5
): Promise<{ repo: string; pulls: LiveGitHubItem[]; issues: LiveGitHubItem[] }> {
  const cleanRepo = (repoFullName || 'vercel/next.js')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/+$/, '');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Orbit-AI-Agent-Platform',
  };
  if (githubToken && githubToken.trim()) {
    headers.Authorization = `Bearer ${githubToken.trim()}`;
  }

  const [pullsRes, issuesRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${cleanRepo}/pulls?state=open&per_page=${maxItems}`, {
      headers,
      cache: 'no-store',
    }),
    fetch(`https://api.github.com/repos/${cleanRepo}/issues?state=open&per_page=${maxItems}`, {
      headers,
      cache: 'no-store',
    }),
  ]);

  if (!pullsRes.ok && !issuesRes.ok) {
    throw new Error(`GitHub API returned status ${pullsRes.status} for ${cleanRepo}`);
  }

  const rawPulls = pullsRes.ok
    ? ((await pullsRes.json()) as {
        id: number;
        number: number;
        title: string;
        state: string;
        html_url: string;
        created_at: string;
        user?: { login?: string };
      }[])
    : [];

  const rawIssues = issuesRes.ok
    ? ((await issuesRes.json()) as {
        id: number;
        number: number;
        title: string;
        state: string;
        html_url: string;
        created_at: string;
        pull_request?: unknown;
        user?: { login?: string };
      }[])
    : [];

  const pulls: LiveGitHubItem[] = (Array.isArray(rawPulls) ? rawPulls : [])
    .slice(0, maxItems)
    .map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login || 'github-user',
      url: pr.html_url,
      createdAt: pr.created_at,
      isPullRequest: true,
    }));

  const issues: LiveGitHubItem[] = (Array.isArray(rawIssues) ? rawIssues : [])
    .filter((iss) => !iss.pull_request)
    .slice(0, maxItems)
    .map((iss) => ({
      id: iss.id,
      number: iss.number,
      title: iss.title,
      state: iss.state,
      author: iss.user?.login || 'github-user',
      url: iss.html_url,
      createdAt: iss.created_at,
      isPullRequest: false,
    }));

  return { repo: cleanRepo, pulls, issues };
}

export async function createLiveNotionPage(params: {
  notionToken: string;
  parentId: string;
  title: string;
  content: string;
}): Promise<{ id: string; url: string }> {
  const cleanToken = (params.notionToken || '').trim();
  const cleanParentId = (params.parentId || '').trim().replace(/-/g, '');
  if (!cleanToken || !cleanParentId) {
    throw new Error('Missing Notion Integration Token or Parent Page/Database ID');
  }

  const paragraphs = (params.content || 'Generated by Orbit AI Agent.')
    .split(/\n+/)
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: line.slice(0, 1800) },
          },
        ],
      },
    }));

  // First try creating under parent page_id; if it's a database_id, fallback automatically
  const buildBody = (parentType: 'page_id' | 'database_id') => ({
    parent: { [parentType]: cleanParentId },
    properties:
      parentType === 'page_id'
        ? {
            title: {
              title: [{ type: 'text', text: { content: params.title.slice(0, 200) } }],
            },
          }
        : {
            Name: {
              title: [{ type: 'text', text: { content: params.title.slice(0, 200) } }],
            },
          },
    children: paragraphs,
  });

  let res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(buildBody('page_id')),
  });

  if (!res.ok) {
    res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(buildBody('database_id')),
    });
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(
      (errJson as { message?: string }).message || `Notion API returned status ${res.status}`
    );
  }

  const created = (await res.json()) as { id: string; url?: string };
  return {
    id: created.id,
    url: created.url || `https://www.notion.so/${created.id.replace(/-/g, '')}`,
  };
}

export async function executeLiveToolAction(params: {
  slug: string;
  agentName?: string;
  composioSessionId?: string;
  locale?: Locale;
  targetParam?: string;
  apiToken?: string;
  webhookUrl?: string;
}): Promise<{ message: string; report: ToolLiveExecutionReport }> {
  const cleanSlug = (params.slug || '').toLowerCase().trim();
  const locale = params.locale || 'fr';
  const agentStub = {
    name: params.agentName || 'Orbit Agent',
    composioSessionId: params.composioSessionId || 'sess_comp_active',
  };

  // 1. Live Reddit JSON Feed
  if (cleanSlug === 'reddit') {
    const sub = (params.targetParam || 'artificial').replace(/^\/?r\//i, '').trim() || 'artificial';
    try {
      const res = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=5`, {
        headers: {
          'User-Agent': 'Orbit-AI-Agent-Platform/2.4',
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          data?: {
            children?: {
              data?: {
                id?: string;
                title?: string;
                author?: string;
                ups?: number;
                num_comments?: number;
                selftext?: string;
                permalink?: string;
              };
            }[];
          };
        };
        const children = (data.data?.children || []).slice(0, 4);
        if (children.length > 0) {
          const items: ToolExecutionResultItem[] = children.map((c, idx) => {
            const d = c.data || {};
            return {
              id: d.id || `rd_${idx}`,
              title: d.title || 'Reddit Thread',
              subtitle: `r/${sub} · u/${d.author || 'reddit'}`,
              badge: `${d.ups ?? 0} upvotes · ${d.num_comments ?? 0} comments`,
              summary:
                (d.selftext || '').trim().slice(0, 180) ||
                `Discussion active sur r/${sub} récupérée en temps réel via l'API JSON Reddit.`,
              url: d.permalink ? `https://www.reddit.com${d.permalink}` : `https://www.reddit.com/r/${sub}`,
            };
          });
          return {
            message: buildRichToolResponse('reddit', agentStub, locale, sub).message,
            report: {
              slug: 'reddit',
              toolName: 'Reddit',
              mode: 'live_feed',
              statusLabel: `Reddit JSON Live (r/${sub}) · ${items.length} posts`,
              executedAt: new Date().toISOString(),
              items,
            },
          };
        }
      }
    } catch {
      // Fallback to structured Reddit report
    }
    return buildRichToolResponse('reddit', agentStub, locale, sub);
  }

  // 2. Live GitHub REST API v3
  if (cleanSlug === 'github') {
    const repo = (params.targetParam || 'vercel/next.js').trim();
    try {
      const gh = await fetchLiveGitHubRepoActivity(repo, params.apiToken, 4);
      const combined = [...gh.pulls.slice(0, 3), ...gh.issues.slice(0, 2)];
      if (combined.length > 0) {
        const items: ToolExecutionResultItem[] = combined.map((it) => ({
          id: String(it.id),
          title: `#${it.number} · ${it.title}`,
          subtitle: `${gh.repo} · @${it.author}`,
          badge: `${it.isPullRequest ? 'Pull Request' : 'Issue'} · ${it.state}`,
          summary: `Récupéré en direct depuis api.github.com/repos/${gh.repo}`,
          url: it.url,
        }));
        return {
          message: buildRichToolResponse('github', agentStub, locale, gh.repo).message,
          report: {
            slug: 'github',
            toolName: 'GitHub',
            mode: 'live_api',
            statusLabel: `GitHub REST v3 (${gh.repo}) · ${items.length} éléments`,
            executedAt: new Date().toISOString(),
            items,
          },
        };
      }
    } catch {
      // Fallback to structured GitHub report
    }
    return buildRichToolResponse('github', agentStub, locale, repo);
  }

  // 3. Live Discord Incoming Webhook
  if (cleanSlug === 'discord' && params.webhookUrl?.startsWith('https://discord.com/api/webhooks/')) {
    try {
      const text =
        params.targetParam ||
        `🚀 **[Orbit Agent · ${agentStub.name}]** Synchronisation Discord Webhook active (${new Date().toLocaleTimeString()}).`;
      const res = await fetch(params.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        return {
          message: `Notification publiée en direct sur votre serveur **Discord** via Webhook : "${text}"`,
          report: {
            slug: 'discord',
            toolName: 'Discord',
            mode: 'live_webhook',
            statusLabel: 'Webhook Discord livré en direct (HTTP 204)',
            executedAt: new Date().toISOString(),
            items: [
              {
                id: `disc_live_${Date.now()}`,
                title: 'Message Webhook Discord livré avec succès',
                subtitle: 'Discord Incoming Webhook',
                badge: 'HTTP 204 · Livré',
                summary: text,
              },
            ],
          },
        };
      }
    } catch {
      // Fallback
    }
  }

  // 4. Live Linear GraphQL API (if API key provided)
  if (cleanSlug === 'linear' && params.apiToken?.trim()) {
    try {
      const res = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: params.apiToken.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{ issues(first: 4) { nodes { id identifier title priorityLabel url state { name } } } }`,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data?: {
            issues?: {
              nodes?: {
                id: string;
                identifier: string;
                title: string;
                priorityLabel?: string;
                url?: string;
                state?: { name?: string };
              }[];
            };
          };
        };
        const nodes = json.data?.issues?.nodes || [];
        if (nodes.length > 0) {
          const items: ToolExecutionResultItem[] = nodes.map((n) => ({
            id: n.id,
            title: `${n.identifier} · ${n.title}`,
            subtitle: 'Linear GraphQL API',
            badge: `${n.state?.name || 'Active'} · ${n.priorityLabel || 'Normal'}`,
            summary: `Ticket Linear synchronisé en direct (${n.identifier}).`,
            url: n.url,
          }));
          return {
            message: buildRichToolResponse('linear', agentStub, locale, params.targetParam).message,
            report: {
              slug: 'linear',
              toolName: 'Linear',
              mode: 'live_api',
              statusLabel: `Linear GraphQL Live · ${items.length} issues`,
              executedAt: new Date().toISOString(),
              items,
            },
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  return buildRichToolResponse(cleanSlug, agentStub, locale, params.targetParam);
}



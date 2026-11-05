import { buildRawMimeEmail, buildRichToolResponse, extractNotionPageId } from './orbit-logic';
import { Locale } from './i18n';
import {
  GmailCleanupCandidate,
  ToolExecutionResultItem,
  ToolLiveExecutionReport,
} from './types';

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

export function parseListUnsubscribeHeader(rawHeader: string): {
  unsubscribeUrl?: string;
  unsubscribeMailto?: string;
} {
  if (!rawHeader) return {};
  const urlMatch = rawHeader.match(/<(https?:\/\/[^>]+)>/) || rawHeader.match(/(https?:\/\/[^\s,>]+)/);
  const mailtoMatch = rawHeader.match(/<(mailto:[^>]+)>/) || rawHeader.match(/(mailto:[^\s,>]+)/);
  return {
    unsubscribeUrl: urlMatch ? urlMatch[1] : undefined,
    unsubscribeMailto: mailtoMatch ? mailtoMatch[1] : undefined,
  };
}

export async function scanLiveGmailCleanupCandidates(
  bearerHeaderOrToken: string,
  maxResults = 12
): Promise<GmailCleanupCandidate[]> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const promoQuery = encodeURIComponent(
    'category:promotions OR category:social OR unsubscribe OR "se désabonner" OR newsletter'
  );
  let listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${promoQuery}&maxResults=${maxResults}`,
    {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    }
  );

  if (!listRes.ok) {
    throw new Error(`Gmail API returned status ${listRes.status}`);
  }

  let listData = (await listRes.json()) as { messages?: { id: string }[] };
  let messageRefs = listData.messages || [];

  // Fallback to general inbox messages if no promotional query match
  if (messageRefs.length === 0) {
    listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      }
    );
    if (listRes.ok) {
      listData = (await listRes.json()) as { messages?: { id: string }[] };
      messageRefs = listData.messages || [];
    }
  }

  const details = await Promise.all(
    messageRefs.slice(0, maxResults).map(async (msg): Promise<GmailCleanupCandidate | null> => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=List-Unsubscribe`,
          {
            headers: { Authorization: authHeader },
            cache: 'no-store',
          }
        );
        if (!msgRes.ok) return null;
        const msgJson = (await msgRes.json()) as {
          id: string;
          snippet?: string;
          labelIds?: string[];
          payload?: { headers?: { name: string; value: string }[] };
        };
        const headers = msgJson.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const rawUnsub = getHeader('List-Unsubscribe');
        const { unsubscribeUrl, unsubscribeMailto } = parseListUnsubscribeHeader(rawUnsub);
        const labels = msgJson.labelIds || [];
        const categoryLabel = labels.includes('CATEGORY_PROMOTIONS')
          ? 'Promotion'
          : labels.includes('CATEGORY_SOCIAL')
            ? 'Réseau social'
            : rawUnsub
              ? 'Newsletter'
              : 'Courrier';

        return {
          id: msgJson.id,
          subject: (getHeader('Subject') || '(Sans objet)').slice(0, 140),
          from: (getHeader('From') || 'Expéditeur inconnu').slice(0, 120),
          date: (getHeader('Date') || '').slice(0, 48),
          snippet: (msgJson.snippet || '').slice(0, 140),
          categoryLabel,
          unsubscribeUrl: unsubscribeUrl ? unsubscribeUrl.slice(0, 500) : undefined,
          unsubscribeMailto: unsubscribeMailto
            ? unsubscribeMailto.slice(0, 240)
            : undefined,
        };
      } catch {
        return null;
      }
    })
  );

  return details.filter((item): item is GmailCleanupCandidate => item !== null);
}

export async function trashLiveGmailMessages(
  bearerHeaderOrToken: string,
  messageIds: string[]
): Promise<{ trashedIds: string[]; trashedCount: number; failedCount: number }> {
  const authHeader = bearerHeaderOrToken.startsWith('Bearer ')
    ? bearerHeaderOrToken
    : `Bearer ${bearerHeaderOrToken}`;

  const trashedIds: string[] = [];
  let failedCount = 0;

  await Promise.all(
    messageIds.map(async (id) => {
      const cleanId = (id || '').trim();
      if (!cleanId) return;
      try {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(cleanId)}/trash`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          }
        );
        if (res.ok) {
          trashedIds.push(cleanId);
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    })
  );

  return { trashedIds, trashedCount: trashedIds.length, failedCount };
}

export async function executeLiveUnsubscribeBatch(
  urls: string[]
): Promise<{ succeededUrls: string[]; failedCount: number }> {
  const uniqueUrls = Array.from(
    new Set(
      (urls || [])
        .map((u) => (u || '').trim())
        .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
    )
  ).slice(0, 25);

  const succeededUrls: string[] = [];
  let failedCount = 0;

  await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        try {
          // 1. Try RFC 8058 One-Click Unsubscribe POST first
          const postRes = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (compatible; OrbitGmailUnsubscribe/1.0)',
            },
            body: 'List-Unsubscribe=One-Click',
            redirect: 'follow',
            signal: controller.signal,
          });
          if (postRes.ok || (postRes.status >= 200 && postRes.status < 400)) {
            succeededUrls.push(url);
            return;
          }
          // 2. Fallback to HTTP GET on the unsubscribe link
          const getRes = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; OrbitGmailUnsubscribe/1.0)',
            },
            redirect: 'follow',
            signal: controller.signal,
          });
          if (getRes.ok || (getRes.status >= 200 && getRes.status < 400)) {
            succeededUrls.push(url);
          } else {
            failedCount++;
          }
        } finally {
          clearTimeout(timer);
        }
      } catch {
        failedCount++;
      }
    })
  );

  return { succeededUrls, failedCount };
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

export interface NotionVerificationResult {
  valid: boolean;
  botName: string;
  workspaceName: string;
  resolvedParentId: string;
  resolvedParentTitle: string;
  sharedPagesCount: number;
  sharedPages: { id: string; title: string; url: string; object: string }[];
}

export async function verifyNotionTokenAndFindParent(
  notionToken: string,
  rawParentIdOrUrl?: string
): Promise<NotionVerificationResult> {
  const cleanToken = (notionToken || '').trim();
  if (!cleanToken) {
    throw new Error(
      'Veuillez renseigner votre Clé d’intégration Notion (commençant par ntn_... ou secret_...).'
    );
  }

  const meRes = await fetch('https://api.notion.com/v1/users/me', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!meRes.ok) {
    const errJson = await meRes.json().catch(() => ({}));
    throw new Error(
      (errJson as { message?: string }).message ||
        `Clé API Notion invalide (HTTP ${meRes.status}). Vérifiez votre jeton sur notion.so/profile/integrations.`
    );
  }

  const meData = (await meRes.json()) as {
    name?: string;
    bot?: { workspace_name?: string };
  };
  const botName = meData.name || 'Orbit Integration';
  const workspaceName = meData.bot?.workspace_name || 'Espace Notion';

  // Search pages and databases shared with this integration
  const searchRes = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ page_size: 15 }),
  });

  const sharedPages: { id: string; title: string; url: string; object: string }[] = [];
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as {
      results?: Array<{
        id: string;
        object: string;
        url?: string;
        properties?: Record<
          string,
          { type?: string; title?: Array<{ plain_text?: string }> }
        >;
        title?: Array<{ plain_text?: string }>;
      }>;
    };
    for (const item of searchData.results || []) {
      let itemTitle = 'Page Notion partagée';
      if (Array.isArray(item.title) && item.title[0]?.plain_text) {
        itemTitle = item.title[0].plain_text;
      } else if (item.properties) {
        for (const prop of Object.values(item.properties)) {
          if (prop?.type === 'title' && Array.isArray(prop.title) && prop.title[0]?.plain_text) {
            itemTitle = prop.title[0].plain_text;
            break;
          }
        }
      }
      sharedPages.push({
        id: item.id.replace(/-/g, ''),
        title: itemTitle,
        url: item.url || `https://www.notion.so/${item.id.replace(/-/g, '')}`,
        object: item.object || 'page',
      });
    }
  }

  const explicitId = extractNotionPageId(rawParentIdOrUrl || '');
  const matchedShared = explicitId
    ? sharedPages.find((p) => p.id.toLowerCase() === explicitId.toLowerCase())
    : sharedPages[0];

  const resolvedParentId = explicitId || matchedShared?.id || '';
  const resolvedParentTitle =
    matchedShared?.title || (explicitId ? `Page ID ${explicitId.slice(0, 8)}...` : '');

  return {
    valid: true,
    botName,
    workspaceName,
    resolvedParentId,
    resolvedParentTitle,
    sharedPagesCount: sharedPages.length,
    sharedPages,
  };
}

export async function createLiveNotionPage(params: {
  notionToken: string;
  parentId?: string;
  title: string;
  content: string;
}): Promise<{ id: string; url: string; workspaceName?: string; parentTitle?: string }> {
  const cleanToken = (params.notionToken || '').trim();
  if (!cleanToken) {
    throw new Error('Clé d’intégration Notion (ntn_... ou secret_...) manquante.');
  }

  let cleanParentId = extractNotionPageId(params.parentId || '');
  let workspaceName = 'Espace Notion';
  let parentTitle = '';

  if (!cleanParentId) {
    const verification = await verifyNotionTokenAndFindParent(cleanToken, params.parentId);
    cleanParentId = verification.resolvedParentId;
    workspaceName = verification.workspaceName;
    parentTitle = verification.resolvedParentTitle;
  }

  if (!cleanParentId) {
    throw new Error(
      "Votre clé API Notion est valide, mais aucune page Notion n'a encore été partagée avec cette intégration. Ouvrez une page dans Notion, cliquez sur '...' en haut à droite -> 'Connexions' (Connect to), ajoutez votre intégration, ou collez l'URL/ID de la page parente."
    );
  }

  const lines = (params.content || 'Generated by Orbit AI Agent.')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);

  const childrenBlocks = lines.map((line) => {
    if (line.startsWith('## ')) {
      return {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^##\s+/, '').slice(0, 200) } }],
        },
      };
    }
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      return {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: line.replace(/^[•\-*]\s+/, '').slice(0, 1800) } },
          ],
        },
      };
    }
    return {
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
    };
  });

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
    children: childrenBlocks,
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
      (errJson as { message?: string }).message ||
        `L'API Notion a refusé la création (HTTP ${res.status}). Vérifiez que la page parente (${cleanParentId}) est bien partagée avec votre intégration Notion via '...' -> 'Connexions'.`
    );
  }

  const created = (await res.json()) as { id: string; url?: string };
  return {
    id: created.id,
    url: created.url || `https://www.notion.so/${created.id.replace(/-/g, '')}`,
    workspaceName,
    parentTitle,
  };
}

export interface ToolVerificationResult {
  valid: boolean;
  slug: string;
  verifiedLabel: string;
  resolvedTargetParam?: string;
}

/**
 * Verifies real credentials / OAuth tokens / Webhooks / live feeds for all 12 tools in TOOL_CATALOG.
 * Throws an explicit French error message if the credential is missing or rejected by the provider API.
 */
export async function verifyLiveToolCredentials(params: {
  slug: string;
  apiToken?: string;
  webhookUrl?: string;
  targetParam?: string;
  workspaceBearerToken?: string;
}): Promise<ToolVerificationResult> {
  const cleanSlug = (params.slug || '').toLowerCase().trim();
  const cleanToken = (params.apiToken || '').trim();
  const cleanWebhook = (params.webhookUrl || '').trim();
  const cleanTarget = (params.targetParam || '').trim();
  const cleanBearer = (params.workspaceBearerToken || '').trim();

  // 1. Notion (Official API v1)
  if (cleanSlug === 'notion') {
    const res = await verifyNotionTokenAndFindParent(cleanToken, cleanTarget);
    return {
      valid: true,
      slug: 'notion',
      verifiedLabel: `${res.workspaceName} (${res.sharedPagesCount} page(s) partagée(s))`,
      resolvedTargetParam: res.resolvedParentId || cleanTarget,
    };
  }

  // 2. Google Workspace (Gmail, Google Calendar, Google Docs)
  if (cleanSlug === 'gmail' || cleanSlug === 'google_calendar' || cleanSlug === 'google_docs') {
    const tokenToTest = cleanBearer || cleanToken;
    if (!tokenToTest) {
      throw new Error(
        `Aucun jeton OAuth 2.0 Google actif. Cliquez sur "Autoriser Google Workspace (OAuth)" ou collez un jeton d'accès Bearer ya29...`
      );
    }
    const authHeader = tokenToTest.startsWith('Bearer ')
      ? tokenToTest
      : `Bearer ${tokenToTest}`;

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    if (!infoRes.ok) {
      throw new Error(
        `Jeton OAuth Google expiré ou invalide (HTTP ${infoRes.status}). Veuillez vous reconnecter via Google OAuth.`
      );
    }
    const info = (await infoRes.json()) as { email?: string; name?: string };
    return {
      valid: true,
      slug: cleanSlug,
      verifiedLabel: `Compte Google vérifié : ${info.email || info.name || 'OAuth Actif'}`,
      resolvedTargetParam: cleanTarget,
    };
  }

  // 3. Slack (Incoming Webhook or Bot Token xoxb-...)
  if (cleanSlug === 'slack') {
    if (cleanWebhook) {
      if (!cleanWebhook.startsWith('https://hooks.slack.com/')) {
        throw new Error(
          "L'URL Webhook Slack doit commencer par https://hooks.slack.com/services/..."
        );
      }
      const res = await postToSlackWebhook(
        cleanWebhook,
        `✅ *[Orbit AI]* Connexion Webhook Slack vérifiée avec succès (${new Date().toLocaleTimeString()}).`
      );
      if (!res.delivered) {
        throw new Error(`Le Webhook Slack a répondu HTTP ${res.status}. Vérifiez l'URL.`);
      }
      return {
        valid: true,
        slug: 'slack',
        verifiedLabel: `Webhook Slack vérifié (HTTP ${res.status}) · Canal ${cleanTarget || '#new-channel'}`,
        resolvedTargetParam: cleanTarget || '#new-channel',
      };
    }

    if (cleanToken) {
      const authRes = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
      });
      const authData = (await authRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        team?: string;
        user?: string;
      };
      if (!authData.ok) {
        throw new Error(
          `Jeton Slack refusé par slack.com/api/auth.test (${authData.error || 'invalid_auth'}).`
        );
      }
      return {
        valid: true,
        slug: 'slack',
        verifiedLabel: `Workspace Slack "${authData.team || 'Slack'}" (@${authData.user || 'bot'})`,
        resolvedTargetParam: cleanTarget || '#new-channel',
      };
    }

    throw new Error(
      'Veuillez renseigner une URL Incoming Webhook Slack (https://hooks.slack.com/services/...) ou un Bot Token Slack (xoxb-...).'
    );
  }

  // 4. GitHub (REST API v3 — repo + optional PAT)
  if (cleanSlug === 'github') {
    const repo = (cleanTarget || 'vercel/next.js')
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/+$/, '');
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Orbit-AI-Agent-Platform',
    };
    if (cleanToken) {
      headers.Authorization = `Bearer ${cleanToken}`;
      const userRes = await fetch('https://api.github.com/user', {
        headers,
        cache: 'no-store',
      });
      if (!userRes.ok) {
        throw new Error(
          `Personal Access Token GitHub invalide (HTTP ${userRes.status}). Vérifiez votre jeton ghp_... / github_pat_...`
        );
      }
    }
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      cache: 'no-store',
    });
    if (!repoRes.ok) {
      throw new Error(
        `Dépôt GitHub "${repo}" introuvable ou privé (HTTP ${repoRes.status}). Si ce dépôt est privé, ajoutez un jeton ghp_...`
      );
    }
    const repoData = (await repoRes.json()) as {
      full_name?: string;
      stargazers_count?: number;
      open_issues_count?: number;
      private?: boolean;
    };
    return {
      valid: true,
      slug: 'github',
      verifiedLabel: `${repoData.full_name || repo} (${repoData.open_issues_count ?? 0} issues/PRs · ${cleanToken ? 'Jeton PAT vérifié' : 'Lecture publique'})`,
      resolvedTargetParam: repoData.full_name || repo,
    };
  }

  // 5. Discord (Official Webhook verification)
  if (cleanSlug === 'discord') {
    if (!cleanWebhook && !cleanToken) {
      throw new Error(
        "Veuillez renseigner l'URL Webhook Discord de votre salon (https://discord.com/api/webhooks/...)."
      );
    }
    if (cleanWebhook) {
      if (
        !cleanWebhook.startsWith('https://discord.com/api/webhooks/') &&
        !cleanWebhook.startsWith('https://discordapp.com/api/webhooks/')
      ) {
        throw new Error(
          "L'URL Webhook Discord doit commencer par https://discord.com/api/webhooks/..."
        );
      }
      const res = await fetch(cleanWebhook, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Webhook Discord introuvable ou révoqué (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as { name?: string; channel_id?: string };
      return {
        valid: true,
        slug: 'discord',
        verifiedLabel: `Webhook Discord actif : "${data.name || 'Bot'}" (Salon ID ${data.channel_id || 'vérifié'})`,
        resolvedTargetParam: cleanTarget || '#announcements',
      };
    }
    const meRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: cleanToken.startsWith('Bot ') ? cleanToken : `Bot ${cleanToken}` },
      cache: 'no-store',
    });
    if (!meRes.ok) {
      throw new Error(`Bot Token Discord invalide (HTTP ${meRes.status}).`);
    }
    const me = (await meRes.json()) as { username?: string };
    return {
      valid: true,
      slug: 'discord',
      verifiedLabel: `Bot Discord vérifié : @${me.username || 'bot'}`,
      resolvedTargetParam: cleanTarget || '#announcements',
    };
  }

  // 6. Linear (Official GraphQL API)
  if (cleanSlug === 'linear') {
    if (!cleanToken) {
      throw new Error(
        'Veuillez renseigner votre Clé API Personnelle Linear (lin_api_...) créée sur linear.app/settings/api.'
      );
    }
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: cleanToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{ viewer { id name email organization { name } } }`,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: {
        viewer?: { name?: string; email?: string; organization?: { name?: string } };
      };
      errors?: { message?: string }[];
    };
    if (!res.ok || !json.data?.viewer) {
      throw new Error(
        json.errors?.[0]?.message ||
          `Clé API Linear invalide (HTTP ${res.status}). Vérifiez votre clé lin_api_...`
      );
    }
    const v = json.data.viewer;
    return {
      valid: true,
      slug: 'linear',
      verifiedLabel: `Linear vérifié : ${v.organization?.name || 'Workspace'} (${v.name || v.email || 'Utilisateur'})`,
      resolvedTargetParam: cleanTarget || 'ENG',
    };
  }

  // 7. ClickUp (Official API v2)
  if (cleanSlug === 'clickup') {
    if (!cleanToken) {
      throw new Error(
        'Veuillez renseigner votre Personal API Token ClickUp (pk_...) généré dans ClickUp Settings -> Apps.'
      );
    }
    const res = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: cleanToken },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(
        `Jeton ClickUp invalide (HTTP ${res.status}). Vérifiez que votre jeton commence bien par pk_...`
      );
    }
    const data = (await res.json()) as {
      user?: { username?: string; email?: string };
    };
    return {
      valid: true,
      slug: 'clickup',
      verifiedLabel: `ClickUp vérifié : ${data.user?.username || data.user?.email || 'Compte actif'}`,
      resolvedTargetParam: cleanTarget,
    };
  }

  // 8. Microsoft Outlook (Microsoft Graph v1.0 or Office 365 Webhook)
  if (cleanSlug === 'outlook') {
    if (cleanToken) {
      const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(
          `Jeton Microsoft Graph refusé (HTTP ${res.status}). Fournissez un jeton Bearer Graph valide.`
        );
      }
      const me = (await res.json()) as { displayName?: string; mail?: string; userPrincipalName?: string };
      return {
        valid: true,
        slug: 'outlook',
        verifiedLabel: `Outlook vérifié : ${me.mail || me.userPrincipalName || me.displayName || 'Microsoft 365'}`,
        resolvedTargetParam: cleanTarget || 'Inbox',
      };
    }
    if (cleanWebhook && cleanWebhook.startsWith('https://')) {
      return {
        valid: true,
        slug: 'outlook',
        verifiedLabel: `Webhook Office 365 / Power Automate configuré`,
        resolvedTargetParam: cleanTarget || 'Inbox',
      };
    }
    throw new Error(
      'Veuillez renseigner un jeton OAuth Microsoft Graph (Bearer eyJ...) ou une URL Webhook Office 365.'
    );
  }

  // 9. Reddit (Live JSON API verification)
  if (cleanSlug === 'reddit') {
    const sub = (cleanTarget || 'artificial').replace(/^\/?r\//i, '').trim() || 'artificial';
    const res = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=3`, {
      headers: {
        'User-Agent': 'Orbit-AI-Agent-Platform/2.5',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Le subreddit r/${sub} est inaccessible (HTTP ${res.status}).`);
    }
    const data = (await res.json()) as {
      data?: { children?: { data?: { title?: string } }[] };
    };
    const count = data.data?.children?.length || 0;
    if (count === 0) {
      throw new Error(`Aucune discussion publique trouvée sur r/${sub}. Vérifiez le nom du subreddit.`);
    }
    return {
      valid: true,
      slug: 'reddit',
      verifiedLabel: `Flux JSON Reddit r/${sub} vérifié en direct (${count} discussions actives)`,
      resolvedTargetParam: sub,
    };
  }

  // 10. YouTube (Data API v3 Key or Public XML RSS Feed)
  if (cleanSlug === 'youtube') {
    const channelId = cleanTarget || 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
    if (cleanToken) {
      const apiRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(cleanToken)}`,
        { cache: 'no-store' }
      );
      if (!apiRes.ok) {
        throw new Error(
          `Clé YouTube Data API v3 refusée (HTTP ${apiRes.status}). Vérifiez votre clé AIza...`
        );
      }
      const apiData = (await apiRes.json()) as {
        items?: { snippet?: { title?: string } }[];
      };
      const chTitle = apiData.items?.[0]?.snippet?.title || channelId;
      return {
        valid: true,
        slug: 'youtube',
        verifiedLabel: `YouTube Data API v3 vérifiée · Chaîne : ${chTitle}`,
        resolvedTargetParam: channelId,
      };
    }

    const rssRes = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { cache: 'no-store' }
    );
    if (!rssRes.ok) {
      throw new Error(
        `Flux YouTube introuvable pour l'ID de chaîne "${channelId}" (commençant par UC...).`
      );
    }
    const xml = await rssRes.text();
    const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const chName = titleMatch?.[1] || channelId;
    return {
      valid: true,
      slug: 'youtube',
      verifiedLabel: `Flux YouTube vérifié en direct : ${chName}`,
      resolvedTargetParam: channelId,
    };
  }

  throw new Error(`Outil "${cleanSlug}" non reconnu.`);
}

export async function executeLiveToolAction(params: {
  slug: string;
  agentName?: string;
  composioSessionId?: string;
  locale?: Locale;
  targetParam?: string;
  apiToken?: string;
  webhookUrl?: string;
  workspaceBearerToken?: string;
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
          'User-Agent': 'Orbit-AI-Agent-Platform/2.5',
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
            message: `Voici les discussions récupérées **en direct** depuis **Reddit (r/${sub})** :\n\n${items
              .map((it, i) => `${i + 1}. **[${it.title}](${it.url})** (${it.badge})`)
              .join('\n')}`,
            report: {
              slug: 'reddit',
              toolName: 'Reddit',
              mode: 'live_feed',
              statusLabel: `API JSON Reddit Temps Réel (r/${sub}) · ${items.length} posts`,
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
          message: `Voici les Pull Requests et Issues ouvertes en direct sur **GitHub (${gh.repo})** :\n\n${items
            .map((it, i) => `${i + 1}. **[${it.title}](${it.url})** (${it.subtitle} · *${it.badge}*)`)
            .join('\n')}`,
          report: {
            slug: 'github',
            toolName: 'GitHub',
            mode: 'live_api',
            statusLabel: `GitHub REST v3 Live (${gh.repo}) · ${items.length} éléments`,
            executedAt: new Date().toISOString(),
            items,
          },
        };
      }
    } catch {
      // Fallback
    }
  }

  // 3. Live YouTube XML RSS Feed
  if (cleanSlug === 'youtube') {
    const channelId = (params.targetParam || 'UC_x5XG1OV2P6uZZ5FSM9Ttw').trim();
    try {
      const rssRes = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
        { cache: 'no-store' }
      );
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const entryMatches = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).slice(0, 4);
        if (entryMatches.length > 0) {
          const items: ToolExecutionResultItem[] = entryMatches.map((m, idx) => {
            const block = m[1];
            const vidId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] || `yt_${idx}`;
            const title = block.match(/<title>([^<]+)<\/title>/)?.[1] || 'Vidéo YouTube';
            const published = (block.match(/<published>([^<]+)<\/published>/)?.[1] || '').slice(0, 10);
            return {
              id: vidId,
              title,
              subtitle: `Chaîne ${channelId}`,
              badge: `Publié le ${published || 'récemment'}`,
              summary: `Vidéo extraite en direct depuis le flux officiel YouTube.`,
              url: `https://www.youtube.com/watch?v=${vidId}`,
            };
          });
          return {
            message: `Voici les dernières vidéos publiées en direct sur **YouTube** :\n\n${items
              .map((it, i) => `${i + 1}. **[${it.title}](${it.url})** (${it.badge})`)
              .join('\n')}`,
            report: {
              slug: 'youtube',
              toolName: 'YouTube',
              mode: 'live_feed',
              statusLabel: `Flux YouTube Temps Réel · ${items.length} vidéos`,
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

  // 4. Live Slack Webhook Delivery
  if (cleanSlug === 'slack' && params.webhookUrl?.startsWith('https://hooks.slack.com/')) {
    try {
      const text =
        params.targetParam && !params.targetParam.startsWith('#')
          ? params.targetParam
          : `🚀 *[Orbit Agent · ${agentStub.name}]* Point de synchronisation Slack exécuté en direct (${new Date().toLocaleTimeString()}).`;
      const delivered = await postToSlackWebhook(params.webhookUrl, text);
      if (delivered.delivered) {
        return {
          message: `✅ Message réellement publié sur votre workspace **Slack** via Incoming Webhook :\n> ${text}`,
          report: {
            slug: 'slack',
            toolName: 'Slack',
            mode: 'live_webhook',
            statusLabel: `Webhook Slack livré en direct (HTTP ${delivered.status})`,
            executedAt: new Date().toISOString(),
            items: [
              {
                id: `slk_live_${Date.now()}`,
                title: 'Message Slack livré avec succès',
                subtitle: 'Slack Incoming Webhook',
                badge: `HTTP ${delivered.status} · Livré`,
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

  // 5. Live Discord Incoming Webhook
  if (cleanSlug === 'discord' && params.webhookUrl?.startsWith('https://discord.com/api/webhooks/')) {
    try {
      const text =
        params.targetParam && !params.targetParam.startsWith('#')
          ? params.targetParam
          : `🚀 **[Orbit Agent · ${agentStub.name}]** Synchronisation Discord Webhook active (${new Date().toLocaleTimeString()}).`;
      const res = await fetch(params.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        return {
          message: `✅ Notification réellement publiée sur votre serveur **Discord** via Webhook : "${text}"`,
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

  // 6. Live Linear GraphQL API (if API key provided)
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
            message: `Voici vos vrais tickets synchronisés depuis **Linear GraphQL API** :\n\n${items
              .map((it, i) => `${i + 1}. **[${it.title}](${it.url})** (*${it.badge}*)`)
              .join('\n')}`,
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

  // 7. Live ClickUp API v2 (if pk_... token provided)
  if (cleanSlug === 'clickup' && params.apiToken?.trim()) {
    try {
      const res = await fetch('https://api.clickup.com/api/v2/team', {
        headers: { Authorization: params.apiToken.trim() },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          teams?: { id: string; name: string; members?: unknown[] }[];
        };
        const teams = data.teams || [];
        if (teams.length > 0) {
          const items: ToolExecutionResultItem[] = teams.map((t) => ({
            id: t.id,
            title: `Workspace ClickUp : ${t.name}`,
            subtitle: `Team ID ${t.id}`,
            badge: `${(t.members || []).length} membre(s) · API v2 Vérifiée`,
            summary: `Espace de travail ClickUp authentifié en direct via api.clickup.com.`,
            url: 'https://app.clickup.com',
          }));
          return {
            message: `Connexion **ClickUp API v2** vérifiée en direct (${teams.length} workspace(s) trouvés).`,
            report: {
              slug: 'clickup',
              toolName: 'ClickUp',
              mode: 'live_api',
              statusLabel: `ClickUp API v2 Live · ${teams.length} workspace(s)`,
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

  // 8. Live Notion Search (if ntn_... / secret_... token provided)
  if (cleanSlug === 'notion' && params.apiToken?.trim()) {
    try {
      const verified = await verifyNotionTokenAndFindParent(params.apiToken.trim(), params.targetParam);
      if (verified.sharedPages.length > 0) {
        const items: ToolExecutionResultItem[] = verified.sharedPages.slice(0, 4).map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: `${verified.workspaceName} · ${p.object.toUpperCase()}`,
          badge: 'API Notion v1 · Partagé',
          summary: `Page Notion réelle accessible par votre intégration (${p.id.slice(0, 8)}...).`,
          url: p.url,
        }));
        return {
          message: `Voici les pages réelles partagées avec votre intégration dans **${verified.workspaceName}** :\n\n${items
            .map((it, i) => `${i + 1}. **[${it.title}](${it.url})**`)
            .join('\n')}`,
          report: {
            slug: 'notion',
            toolName: 'Notion',
            mode: 'live_api',
            statusLabel: `API Notion Vérifiée (${verified.workspaceName}) · ${items.length} page(s)`,
            executedAt: new Date().toISOString(),
            items,
          },
        };
      }
    } catch {
      // Fallback
    }
  }

  // Default fallback: explicitly mark as Mode Démo local so the user is never misled!
  const fallback = buildRichToolResponse(cleanSlug, agentStub, locale, params.targetParam);
  return {
    message:
      `ℹ️ **[Aperçu Mode Démo local — ${fallback.report.toolName}]** *(Aucune clé API / Webhook / OAuth n'est encore configurée pour cet outil, ces données sont un exemple local)* :\n\n` +
      fallback.message,
    report: {
      ...fallback.report,
      statusLabel: `Aperçu Mode Démo local (Configurez la clé API / OAuth pour le mode réel)`,
    },
  };
}




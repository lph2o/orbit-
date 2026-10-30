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

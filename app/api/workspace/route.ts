import { NextRequest, NextResponse } from 'next/server';
import {
  createLiveGmailDraft,
  createLiveGoogleDoc,
  createLiveGoogleSheet,
  createLiveNotionPage,
  executeLiveToolAction,
  executeLiveUnsubscribeBatch,
  fetchLiveCalendarEvents,
  fetchLiveGitHubRepoActivity,
  fetchLiveGmailMessages,
  postToSlackWebhook,
  scanLiveGmailCleanupCandidates,
  sendLiveGmailEmail,
  trashLiveGmailMessages,
  verifyLiveToolCredentials,
  verifyNotionTokenAndFindParent,
} from '@/lib/workspace-server';
import { Locale } from '@/lib/i18n';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization');
  if (!token) {
    return NextResponse.json(
      { error: 'Missing Google Workspace OAuth Bearer token.' },
      { status: 401 }
    );
  }

  try {
    const [gmailResult, calendarResult] = await Promise.allSettled([
      fetchLiveGmailMessages(token, 5),
      fetchLiveCalendarEvents(token, 5),
    ]);

    const gmailMessages =
      gmailResult.status === 'fulfilled' ? gmailResult.value : [];
    const calendarEvents =
      calendarResult.status === 'fulfilled' ? calendarResult.value : [];

    return NextResponse.json({
      gmailMessages,
      calendarEvents,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Google Workspace GET error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google Workspace data.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      title,
      content,
      rows,
      slackWebhookUrl,
      slackText,
      emailTo,
      emailSubject,
      emailBody,
      messageIds,
      unsubscribeUrls,
      githubRepo,
      githubToken,
      notionToken,
      notionParentId,
      toolSlug,
      agentName,
      composioSessionId,
      locale,
      targetParam,
      apiToken,
      webhookUrl,
    }: {
      action:
        | 'create_doc'
        | 'create_sheet'
        | 'post_slack'
        | 'send_gmail'
        | 'create_gmail_draft'
        | 'scan_gmail_cleanup'
        | 'trash_gmail_messages'
        | 'auto_unsubscribe_gmail'
        | 'fetch_github'
        | 'verify_notion'
        | 'verify_tool'
        | 'create_notion_page'
        | 'execute_tool';
      title?: string;
      content?: string;
      rows?: string[][];
      slackWebhookUrl?: string;
      slackText?: string;
      emailTo?: string;
      emailSubject?: string;
      emailBody?: string;
      messageIds?: string[];
      unsubscribeUrls?: string[];
      githubRepo?: string;
      githubToken?: string;
      notionToken?: string;
      notionParentId?: string;
      toolSlug?: string;
      agentName?: string;
      composioSessionId?: string;
      locale?: Locale;
      targetParam?: string;
      apiToken?: string;
      webhookUrl?: string;
    } = body;

    if (action === 'verify_notion') {
      const verification = await verifyNotionTokenAndFindParent(
        notionToken || '',
        notionParentId || ''
      );
      return NextResponse.json(verification);
    }

    if (action === 'verify_tool') {
      if (!toolSlug) {
        return NextResponse.json({ error: 'Missing toolSlug.' }, { status: 400 });
      }
      const headerToken = req.headers.get('Authorization') || '';
      const verified = await verifyLiveToolCredentials({
        slug: toolSlug,
        apiToken,
        webhookUrl,
        targetParam,
        workspaceBearerToken: headerToken,
      });
      return NextResponse.json(verified);
    }

    if (action === 'execute_tool') {
      if (!toolSlug) {
        return NextResponse.json({ error: 'Missing toolSlug.' }, { status: 400 });
      }
      const headerToken = req.headers.get('Authorization') || '';
      const executed = await executeLiveToolAction({
        slug: toolSlug,
        agentName,
        composioSessionId,
        locale,
        targetParam,
        apiToken,
        webhookUrl,
        workspaceBearerToken: headerToken,
      });
      return NextResponse.json(executed);
    }

    if (action === 'post_slack') {
      if (!slackWebhookUrl || !slackText) {
        return NextResponse.json(
          { error: 'Missing Slack Webhook URL or message text.' },
          { status: 400 }
        );
      }
      const result = await postToSlackWebhook(slackWebhookUrl, slackText);
      return NextResponse.json(result);
    }

    if (action === 'fetch_github') {
      const ghResult = await fetchLiveGitHubRepoActivity(
        githubRepo || 'vercel/next.js',
        githubToken,
        5
      );
      return NextResponse.json(ghResult);
    }

    if (action === 'create_notion_page') {
      if (!notionToken) {
        return NextResponse.json(
          { error: 'Clé d’intégration Notion (ntn_... ou secret_...) manquante.' },
          { status: 400 }
        );
      }
      const notionResult = await createLiveNotionPage({
        notionToken,
        parentId: notionParentId || '',
        title: title || `Portfolio Professionnel — ${new Date().toLocaleDateString()}`,
        content: content || 'Generated by Orbit AI Agent.',
      });
      return NextResponse.json(notionResult);
    }

    if (action === 'auto_unsubscribe_gmail') {
      if (Array.isArray(unsubscribeUrls) && unsubscribeUrls.length > 0) {
        const res = await executeLiveUnsubscribeBatch(unsubscribeUrls);
        return NextResponse.json({
          unsubscribedCount: res.succeededUrls.length,
          succeededUrls: res.succeededUrls,
          failedCount: res.failedCount,
        });
      }
      const tokenForUnsub = req.headers.get('Authorization');
      if (!tokenForUnsub) {
        return NextResponse.json(
          { error: 'Missing Google Workspace OAuth Bearer token or unsubscribeUrls.' },
          { status: 401 }
        );
      }
      const candidates = await scanLiveGmailCleanupCandidates(tokenForUnsub, 20);
      const urls = candidates
        .map((c) => c.unsubscribeUrl || '')
        .filter(Boolean);
      const res = await executeLiveUnsubscribeBatch(urls);
      return NextResponse.json({
        unsubscribedCount: res.succeededUrls.length,
        succeededUrls: res.succeededUrls,
        failedCount: res.failedCount,
      });
    }

    const token = req.headers.get('Authorization');
    if (!token) {
      return NextResponse.json(
        { error: 'Missing Google Workspace OAuth Bearer token.' },
        { status: 401 }
      );
    }

    if (action === 'scan_gmail_cleanup') {
      const candidates = await scanLiveGmailCleanupCandidates(token, 20);
      return NextResponse.json({
        candidates,
        scannedAt: new Date().toISOString(),
      });
    }

    if (action === 'trash_gmail_messages') {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return NextResponse.json(
          { error: 'Aucun e-mail sélectionné pour la mise à la corbeille.' },
          { status: 400 }
        );
      }
      const result = await trashLiveGmailMessages(token, messageIds);
      return NextResponse.json(result);
    }

    if (action === 'send_gmail') {
      if (!emailTo || !emailSubject) {
        return NextResponse.json(
          { error: 'Missing recipient email (To) or Subject.' },
          { status: 400 }
        );
      }
      const sent = await sendLiveGmailEmail(token, {
        to: emailTo,
        subject: emailSubject,
        body: emailBody || content || '',
      });
      return NextResponse.json({
        ...sent,
        mode: 'sent',
        to: emailTo,
        subject: emailSubject,
      });
    }

    if (action === 'create_gmail_draft') {
      if (!emailTo || !emailSubject) {
        return NextResponse.json(
          { error: 'Missing recipient email (To) or Subject.' },
          { status: 400 }
        );
      }
      const draft = await createLiveGmailDraft(token, {
        to: emailTo,
        subject: emailSubject,
        body: emailBody || content || '',
      });
      return NextResponse.json({
        ...draft,
        mode: 'draft',
        to: emailTo,
        subject: emailSubject,
      });
    }

    if (action === 'create_doc') {
      const docResult = await createLiveGoogleDoc(
        token,
        title || `Orbit Agent Brief — ${new Date().toLocaleDateString()}`,
        content || 'Generated by Orbit AI Agent.'
      );
      return NextResponse.json(docResult);
    }

    if (action === 'create_sheet') {
      const sheetResult = await createLiveGoogleSheet(
        token,
        title || `Orbit Agent Data — ${new Date().toLocaleDateString()}`,
        rows || [
          ['Timestamp', 'Source', 'Summary'],
          [new Date().toISOString(), 'Orbit AI Agent', content || 'Automated routine digest'],
        ]
      );
      return NextResponse.json(sheetResult);
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    console.error('Google Workspace / Integration POST error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to execute integration action.',
      },
      { status: 500 }
    );
  }
}


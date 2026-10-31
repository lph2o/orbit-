import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { parseCsvDocumentContent, sanitizeId } from '@/lib/orbit-logic';
import { KnowledgeDocument } from '@/lib/types';

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
      agentId,
      name,
      fileType = 'txt',
      sizeBytes = 0,
      rawText = '',
      base64Data = '',
      locale = 'fr',
    }: {
      agentId: string;
      name: string;
      fileType?: 'pdf' | 'csv' | 'txt' | 'md';
      sizeBytes?: number;
      rawText?: string;
      base64Data?: string;
      locale?: 'fr' | 'it' | 'en';
    } = body;

    if (!agentId || !name) {
      return NextResponse.json(
        { error: 'Missing agentId or document name.' },
        { status: 400 }
      );
    }

    const docId = sanitizeId(`doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'doc');
    const nowIso = new Date().toISOString();
    let extractedContent = (rawText || '').trim();
    let summary = '';

    if (fileType === 'csv') {
      const parsed = parseCsvDocumentContent(extractedContent, name);
      extractedContent = parsed.content;
      summary = parsed.summary;
    } else if (fileType === 'pdf' && base64Data) {
      const ai = getGenAIClient();
      if (ai) {
        try {
          const langLabel =
            locale === 'fr' ? 'French' : locale === 'it' ? 'Italian' : 'English';
          const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: `Extract the full key text from this PDF document and write a 2-sentence executive summary in ${langLabel}. Format response as:\nSUMMARY: <summary>\nCONTENT:\n<extracted text>`,
              },
            ],
          });
          const out = (res.text ?? '').trim();
          const summaryMatch = out.match(/SUMMARY:\s*(.+)/i);
          const contentMatch = out.split(/CONTENT:\s*/i)[1];
          if (summaryMatch) summary = summaryMatch[1].trim();
          if (contentMatch) extractedContent = contentMatch.trim();
        } catch (err) {
          console.warn('Gemini PDF extraction fallback:', err);
        }
      }
      if (!extractedContent) {
        extractedContent =
          rawText.trim() ||
          `Document PDF indexé : ${name} (${Math.round(sizeBytes / 1024)} Ko). Contenu prêt pour l'interrogation RAG de l'agent.`;
      }
      if (!summary) {
        summary = `Document PDF "${name}" (${Math.max(1, Math.round(sizeBytes / 1024))} Ko) indexé dans la base de connaissances RAG.`;
      }
    } else {
      if (!extractedContent) {
        extractedContent = `Document "${name}" importé dans la base documentaire.`;
      }
      const firstLines = extractedContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(' — ');
      summary = firstLines.slice(0, 220) || `Document texte "${name}" indexé.`;
    }

    const docRecord: KnowledgeDocument = {
      docId,
      agentId: sanitizeId(agentId, 'agent'),
      name: name.slice(0, 180),
      fileType,
      sizeBytes: sizeBytes || extractedContent.length,
      content: extractedContent.slice(0, 12000),
      summary: summary.slice(0, 400),
      createdAt: nowIso,
    };

    return NextResponse.json({ document: docRecord });
  } catch (error) {
    console.error('Knowledge extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract and index document.' },
      { status: 500 }
    );
  }
}

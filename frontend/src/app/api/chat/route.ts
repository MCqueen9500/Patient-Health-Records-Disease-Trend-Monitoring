import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || 'your_super_secret_jwt_key_change_in_production'
);

export const maxDuration = 30;

/** Convert simple {role, content} objects → CoreMessage[] that ai v7 accepts */
function toCoreMessages(messages: { role: string; content: string }[]) {
  return messages.map(m => {
    if (m.role === 'assistant') {
      return { role: 'assistant' as const, content: [{ type: 'text' as const, text: m.content }] };
    }
    return { role: 'user' as const, content: m.content };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages: { role: string; content: string }[] = body.messages ?? [];

    // Extract role from JWT cookie
    const token = req.cookies.get('token')?.value;
    let role = 'UNKNOWN';

    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        role = (payload as any).role || 'UNKNOWN';
      } catch {
        // invalid token — continue as UNKNOWN
      }
    }

    // Role-specific system prompts
    let systemPrompt = 'You are a helpful healthcare AI assistant.';
    if (role === 'PATIENT') {
      systemPrompt =
        'You are a compassionate, knowledgeable healthcare assistant for the HLTH01 platform. ' +
        'Help patients understand their medical history and explain medical jargon in simple terms. ' +
        'Do NOT provide definitive diagnoses. Always advise consulting a qualified doctor for serious concerns. ' +
        'Keep responses friendly, clear, and concise.';
    } else if (role === 'DOCTOR') {
      systemPrompt =
        'You are an advanced clinical decision support tool for the HLTH01 platform. ' +
        'Assist doctors with drug interactions, patient history summaries, medical literature context, and clinical reasoning. ' +
        'Use professional medical terminology. Be precise, evidence-based, and concise.';
    } else if (role === 'ADMIN') {
      systemPrompt =
        'You are a public health analytics assistant for the HLTH01 platform. ' +
        'Help government officials and public health admins interpret epidemiological data, ' +
        'explain k-anonymity privacy principles, and analyze outbreak alerts.';
    }

    const result = await streamText({
      model: google('gemini-3.8-flash'),
      system: systemPrompt,
      messages: toCoreMessages(rawMessages),
    });

    // Stream plain text back — our custom fetch-based chatbot reads this directly
    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Chat service unavailable. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

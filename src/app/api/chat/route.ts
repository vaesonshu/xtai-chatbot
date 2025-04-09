// app/api/chat/route.ts
import { getChatResponseStream } from '@/lib/chatbot'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { message }: { message: string } = await request.json()

  if (!message) {
    return new Response(JSON.stringify({ error: 'No message provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const stream = await getChatResponseStream(message)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // 返回纯文本流
        'Transfer-Encoding': 'chunked' // 支持分块传输
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

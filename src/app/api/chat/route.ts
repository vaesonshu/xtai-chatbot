// app/api/chat/route.ts
import { getChatResponse } from '@/lib/chatbot'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { message }: { message: string } = await request.json()

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 })
  }

  try {
    const reply = await getChatResponse(message)
    return NextResponse.json({ reply }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// app/api/chat/clear/route.ts
import { clearChatHistory } from '@/lib/chatbot'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    clearChatHistory()
    return NextResponse.json({ message: 'Chat history cleared' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

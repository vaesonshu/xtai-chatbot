// app/api/chat/route.ts
import { getChatResponseStream } from '@/lib/chatbot'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const message = formData.get('message') as string
  const systemPrompt = formData.get('systemPrompt') as string | undefined
  const file = formData.get('file') as File | null
  let fileContent = ''
  // const { message, systemPrompt }: { message: string; systemPrompt?: string } = await request.json()

  if (!message) {
    return new Response(JSON.stringify({ error: 'No message provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (file) {
    fileContent = await file.text()
    console.log('File content:', fileContent)
  }

  try {
    console.log('fileContentfileContentfileContent??????:', fileContent)
    const stream = await getChatResponseStream(message, systemPrompt, fileContent)
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

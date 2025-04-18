// app/api/chat/route.ts
import { getChatResponseStream } from '@/lib/chatbot'
import { NextRequest } from 'next/server'
import * as pdfjsLib from 'pdfjs-dist'

// 禁用 Web Worker，避免 "Setting up fake worker" 警告
// pdfjsLib.GlobalWorkerOptions.workerSrc = 'false'

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
    const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: '仅支持 .txt、.docx、.pdf 文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: '文件大小不能超过 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (file.size === 0) {
      return new Response(JSON.stringify({ error: `文件 "${file.name}" 为空，请上传有效文件` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    try {
      if (file.type === 'text/plain') {
        fileContent = await file.text()
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer()
        if (!arrayBuffer.byteLength) {
          throw new Error('PDF 文件内容为空')
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let textContent = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const text = await page.getTextContent()
          textContent += text.items.map((item: any) => item.str).join(' ') + '\n'
        }
        fileContent = textContent.trim() || 'PDF 内容为空，请检查文件是否包含可提取文本。'
        console.log(`PDF parsed (${file.name}):`, { textLength: fileContent.length })
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // const arrayBuffer = await file.arrayBuffer()
        // if (!arrayBuffer.byteLength) {
        //   throw new Error('DOCX 文件内容为空')
        // }
        // const result = await mammoth.extractRawText({ buffer: arrayBuffer })
        // fileContent = result.value || 'Word 文档内容为空，请检查文件。'
      }

      console.log(`File content (${file.name}):`, fileContent)
    } catch (error) {
      console.error(`文件解析错误 (${file.name}):`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
        fileType: file.type,
        fileSize: file.size
      })
      return new Response(JSON.stringify({ error: `无法解析文件 "${file.name}"，请确保文件格式正确且内容可读` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
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

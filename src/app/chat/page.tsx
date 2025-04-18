// app/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Send, User, Bot, Trash2, Loader2, Upload, X, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown' // 引入 Markdown 渲染
import remarkGfm from 'remark-gfm' // 支持 GFM
import rehypeHighlight from 'rehype-highlight'

// 定义消息类型
interface Message {
  text: string
  sender: 'user' | 'bot'
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [mode, setMode] = useState<string>('friendly') // 动态模式
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string>('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // 根据模式获取系统提示
  const getSystemPrompt = () => {
    switch (mode) {
      case 'formal':
        return '你是一个正式的助手，请用专业、礼貌的中文回答问题。'
      case 'funny':
        return '你是一个幽默的助手，请用风趣的中文回答问题，尽量让人开心。'
      default:
        return undefined // 使用默认提示
    }
  }

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return

    const newMessage: Message = {
      text: input,
      sender: 'user'
    }
    setMessages((prev) => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('message', input)

      if (getSystemPrompt()) {
        formData.append('systemPrompt', getSystemPrompt()!)
      }

      if (file) {
        formData.append('file', file)
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        // headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ message: input, systemPrompt: getSystemPrompt() })
        body: formData
      })

      if (!res.ok) {
        throw new Error('API request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let botMessage = ''

      setMessages((prev) => [...prev, { text: '', sender: 'bot' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        console.log('Received chunk:', chunk)
        botMessage += chunk
        setIsLoading(false)

        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: botMessage
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Error fetching chat response:', error)
      toast.error('无法获取回复，请稍后再试。', {
        description: '发生了网络错误或 API 问题。'
      })
      setMessages((prev) => [
        ...prev,
        {
          text: '抱歉，出了点问题！',
          sender: 'bot'
        }
      ])
    } finally {
      setIsLoading(false)
      setFile(null) // 清空文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 上传文件
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile) {
      // 限制文件类型和大小（1MB）
      const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(uploadedFile.type)) {
        toast.error('仅支持 .txt、.docx、.pdf 文件')
        return
      }
      if (uploadedFile.size > 5 * 1024 * 1024) {
        toast.error('文件大小不能超过 5MB')
        return
      }
      setFile(uploadedFile)
      // 简单预览（文件名和大小）
      const preview = `文件名: ${uploadedFile.name}\n大小: ${(uploadedFile.size / 1024).toFixed(2)} KB`
      setFilePreview(preview)
      toast.success(`文件 "${uploadedFile.name}" 上传成功`, {
        description: '请发送消息以分析文件内容。'
      })
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFilePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.info('文件已移除')
  }

  // 清除聊天记录
  const handleClear = async () => {
    setMessages([])
    setFile(null)
    setFilePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    try {
      const res = await fetch('/api/chat/clear', {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to clear chat history')
      toast.success('聊天记录已清除', {
        description: '所有消息已成功删除。'
      })
    } catch (error) {
      console.error('Error clearing chat history:', error)
      toast.error('清除聊天记录失败', {
        description: '请稍后再试。'
      })
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto p-4 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">简易聊天机器人</h1>
        <div className="flex gap-2">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="选择模式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">友好模式</SelectItem>
              <SelectItem value="formal">正式模式</SelectItem>
              <SelectItem value="funny">幽默模式</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 border rounded-md p-4 mb-4" ref={scrollAreaRef}>
        {messages.length === 0 && !isLoading && <p className="text-center text-muted-foreground">开始聊天吧！</p>}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            {msg.sender === 'bot' && (
              <Avatar className="mr-2">
                <AvatarFallback>
                  <Bot className="w-6 h-6 flex-shrink-0" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={`flex flex-wrap items-start gap-2 max-w-[70%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
            {msg.sender === 'user' && (
              <Avatar className="ml-2">
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>
                  <User className="w-5 h-5 flex-shrink-0" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start mb-4">
            <Avatar className="mr-2">
              <AvatarFallback>
                <Bot className="w-6 h-6 flex-shrink-0" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-start gap-2 max-w-[70%] p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">思考中...</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
      {file && (
        <div className="mb-2 p-3 bg-muted rounded-md flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">已上传文件：{file.name}</p>
            <pre className="text-xs text-muted-foreground mt-1">{filePreview}</pre>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !isLoading && handleSend()} placeholder="输入消息..." className="flex-1" disabled={isLoading} />
        <Button onClick={handleSend} disabled={isLoading} className="w-[50px]">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="outline" asChild disabled={isLoading}>
            <label>
              <Paperclip className="w-4 h-4 mr-2" />
              附件
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
            </label>
          </Button>
          <span className="text-xs text-muted-foreground">目前仅支持 .txt</span>
        </div>
      </div>
    </div>
  )
}

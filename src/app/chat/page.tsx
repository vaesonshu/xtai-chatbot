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
import { Send, User, Bot, Trash2, Loader2 } from 'lucide-react'

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
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, systemPrompt: getSystemPrompt() })
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
    }
  }

  const handleClear = async () => {
    setMessages([])
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
    <div className="max-w-2xl mx-auto p-4 h-screen flex flex-col">
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
            <div className={`flex items-start gap-2 max-w-[70%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <div>
                <span>{msg.text}</span>
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
      <div className="flex gap-2">
        <Input value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !isLoading && handleSend()} placeholder="输入消息..." className="flex-1" disabled={isLoading} />
        <Button onClick={handleSend} disabled={isLoading} className="w-[50px]">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

// app/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Send, User, Bot, Trash2, Clock } from 'lucide-react'
// import { clearChatHistory } from '@/lib/chatbot'

// 定义消息类型
interface Message {
  text: string
  sender: 'user' | 'bot'
  timestamp: string
}

// 定义 API 响应类型
interface ChatResponse {
  reply: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const newMessage: Message = {
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    }
    setMessages((prev) => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      if (!res.ok) {
        throw new Error('API request failed')
      }

      const data: ChatResponse = await res.json()
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            text: data.reply,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString()
          }
        ])
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
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    // clearChatHistory() // 调用新函数
    toast.success('聊天记录已清除', {
      description: '所有消息已成功删除。'
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">简易聊天机器人</h1>
        <Button variant="outline" size="icon" onClick={handleClear}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 border rounded-md p-4 mb-4" ref={scrollAreaRef}>
        {messages.length === 0 && !isLoading && <p className="text-center text-muted-foreground">开始聊天吧！</p>}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex items-start gap-2 max-w-[70%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {msg.sender === 'user' ? <User className="w-5 h-5 flex-shrink-0" /> : <Bot className="w-5 h-5 flex-shrink-0" />}
              <div>
                <span>{msg.text}</span>
                <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                  <Clock className="w-3 h-3" />
                  {msg.timestamp}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start gap-2 max-w-[70%] p-3 rounded-lg bg-muted">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2">
        <Input value={input} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !isLoading && handleSend()} placeholder="输入消息..." className="flex-1" disabled={isLoading} />
        <Button onClick={handleSend} disabled={isLoading}>
          <Send className="w-4 h-4 mr-2" />
          发送
        </Button>
      </div>
    </div>
  )
}

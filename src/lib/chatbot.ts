// lib/chatbot.ts
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY)

// 初始化 DeepSeek 模型（全局单例，避免重复实例化）
const model = new ChatDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 500 // 限制输出长度
})

// 定义系统提示模板，提供机器人角色和行为
const systemTemplate = `
你是一个友好的助手，名字叫“小智”。请用简洁、自然的中文回答用户问题。
如果用户问到你的身份，告诉他们你是 星途 AI 通过 LLM 相关技术生成的一个人工智能助手。
始终保持礼貌，避免生成冗长的回答。
`

const chatPrompt = PromptTemplate.fromTemplate(`
  ${systemTemplate}
  用户: {input}
`)

// 初始化内存，用于保存对话历史
const memory = new BufferMemory({
  returnMessages: true, // 返回完整消息对象，而非纯文本
  memoryKey: 'history' // 内存中的键名
})

// 创建对话链，整合模型、提示和内存
const chain = new ConversationChain({
  llm: model,
  memory,
  prompt: chatPrompt,
  outputParser: new StringOutputParser() // 确保输出为纯字符串
})

// 导出聊天响应函数
export async function getChatResponse(userInput: string): Promise<string> {
  try {
    // 调用对话链，传入用户输入
    const response = await chain.call({
      input: userInput // 用户输入
    })

    // 返回解析后的文本内容
    return response.response as string
  } catch (error) {
    console.error('Chat response error:', error)
    return '抱歉，我遇到了一些问题，请稍后再试！'
  }
}

// 可选：清空对话历史
export function clearChatHistory() {
  memory.clear()
}

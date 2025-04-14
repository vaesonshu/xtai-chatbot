// lib/chatbot.ts
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

// 初始化 DeepSeek 模型（全局单例，避免重复实例化）
const model = new ChatDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
  temperature: 0.7, // 控制生成文本的随机性，值越高越有创意
  maxTokens: 500, // 限制每次响应的最大 token 数量
  streaming: true // 启用流式输出
})

// 定义系统提示模板，提供机器人角色和行为
const defaultSystemPrompt = `
你是一个友好的助手，名字叫“小智”。请用简洁、自然的中文回答用户问题。
如果用户问到你的身份，告诉他们你是 星途 AI 人工智能助手。
始终保持礼貌，避免生成冗长的回答。
返回的内容以 Markdown 格式返回结果（如列表、标题、代码块）。
如果回答涉及代码，请使用 \`\`\` 包裹代码并指定语言（如 \`\`\`javascript）。
如果用户上传了文件，请基于文件内容回答问题，并以 Markdown 格式返回。
`

// 初始化内存，用于保存对话历史
const memory = new BufferMemory({
  returnMessages: true, // 返回完整消息对象，而非纯文本
  memoryKey: 'history' // 内存中的键名
})

// 流式输出函数
export async function getChatResponseStream(userInput: string, customSystemPrompt?: string, fileContent?: string): Promise<ReadableStream> {
  try {
    // 构造包含历史和当前输入的消息
    const { history } = await memory.loadMemoryVariables({})
    console.log('Memory variables:', history)
    // 支持动态提示
    const systemPrompt = (customSystemPrompt || defaultSystemPrompt) + (fileContent ? `\n### 上传文件内容\n\`\`\`text\n${fileContent}\n\`\`\`` : '')
    console.log('System prompt:', systemPrompt)
    const messages = [
      new SystemMessage(systemPrompt), // 系统提示
      ...(history as (HumanMessage | AIMessage)[]), // 历史消息
      new HumanMessage(userInput) // 当前用户输入
    ]

    // 获取流式响应
    const stream = await model.stream(messages)

    // 用于保存完整回复
    let fullResponse = ''

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // console.log('Stream chunk:', chunk)
            const text = chunk.content as string
            fullResponse += text
            controller.enqueue(new TextEncoder().encode(text))
          }
          // 保存到内存
          await memory.saveContext({ input: userInput }, { output: fullResponse })
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(new TextEncoder().encode('抱歉，流式处理出错！'))
          controller.close()
        }
      },
      cancel() {
        console.log('Stream cancelled')
      }
    })
  } catch (error) {
    console.error('Chat stream error:', error)
    return new ReadableStream({
      start(controller) {
        const errorMessage = '抱歉，我遇到了一些问题，请稍后再试！'
        controller.enqueue(new TextEncoder().encode(errorMessage))
        controller.close()
      }
    })
  }
}

// 可选：清空对话历史
export function clearChatHistory() {
  memory.clear()
}

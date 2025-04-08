// lib/chatbot.ts
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage } from '@langchain/core/messages'

export async function getChatResponse(userInput: string): Promise<any> {
  const model = new ChatDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
    temperature: 0.7
  })

  const message = new HumanMessage(userInput)
  const response = await model.invoke([message])

  return response.content
}

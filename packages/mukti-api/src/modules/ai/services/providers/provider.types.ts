export interface AiChatMessage {
  content: string;
  role: 'assistant' | 'system' | 'user';
}

export interface AiProviderCompletionResult {
  completionTokens: number;
  content: string;
  promptTokens: number;
  totalTokens: number;
}

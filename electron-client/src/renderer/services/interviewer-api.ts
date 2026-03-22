/**
 * Interviewer API Service
 * Handles communication with the backend LLM service for the AI Interviewer.
 */

import { AIQuestion } from '@/renderer/lib/mock-ai-responses'

// API configuration - use Vite's import.meta.env for environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface ChatRequest {
  question_id: string
  message: string
  context: {
    question_text: string
    constraints?: string
    input_format?: string
    output_format?: string
    examples?: string[]
    difficulty?: string
  }
  conversation_history?: Array<{ role: string; content: string }>
  attempt_history?: Array<{ action: string; timestamp: number }>
}

export interface ChatResponse {
  reply: string
  type: 'greeting' | 'hint' | 'clarification' | 'encouragement' | 'feedback' | 'general'
  suggested_time?: number
  error?: string
}

/**
 * Send a chat message to the AI Interviewer backend
 */
export async function sendChatMessage(
  questionId: string,
  message: string,
  context: ChatRequest['context'],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<AIQuestion> {
  const request: ChatRequest = {
    question_id: questionId,
    message,
    context,
    conversation_history: conversationHistory,
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/interviewer/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: ChatResponse = await response.json()

    // Convert ChatResponse to AIQuestion format
    return {
      id: `msg-${Date.now()}`,
      type: data.type as AIQuestion['type'],
      content: data.reply,
      timestamp: Date.now(),
      suggestedTime: data.suggested_time,
    }
  } catch (error) {
    console.error('Failed to send chat message:', error)
    throw error
  }
}

/**
 * Request a hint from the AI Interviewer
 */
export async function requestHint(
  questionId: string,
  hintLevel: number,
  context: ChatRequest['context']
): Promise<AIQuestion> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/interviewer/hint?question_id=${questionId}&hint_level=${hintLevel}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: ChatResponse = await response.json()

    return {
      id: `hint-${Date.now()}`,
      type: 'hint',
      content: data.reply,
      timestamp: Date.now(),
      suggestedTime: data.suggested_time,
    }
  } catch (error) {
    console.error('Failed to request hint:', error)
    throw error
  }
}

/**
 * Check if the backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the health status of the LLM service
 */
export async function getHealthStatus(): Promise<{
  status: string
  llm_provider: string
  model: string
} | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Submit evaluation data for a candidate
 */
export async function submitEvaluationData(data: {
  question_id: string
  clarification_count: number
  time_to_first_hint: number
  question_types: string[]
  hint_dependency_level: number
}): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/interviewer/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}
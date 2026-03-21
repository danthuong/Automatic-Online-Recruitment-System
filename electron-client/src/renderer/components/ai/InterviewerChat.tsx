import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/renderer/lib/utils'
import { AIQuestion, getAIResponsesForQuestion, getRandomEncouragement } from '@/renderer/lib/mock-ai-responses'
import { useTheme } from '@/renderer/hooks/useTheme'
import { getHealthStatus } from '@/renderer/services/interviewer-api'
import { 
  Bot, 
  Lightbulb, 
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react'

interface InterviewerChatProps {
  questionId: string
  className?: string
}

export function InterviewerChat({ questionId, className }: InterviewerChatProps) {
  const [messages, setMessages] = useState<AIQuestion[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [healthStatus, setHealthStatus] = useState<{status: string; llm_provider: string; model: string} | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  // Fetch health status on mount
  useEffect(() => {
    const fetchHealth = async () => {
      setIsConnecting(true)
      const status = await getHealthStatus()
      setHealthStatus(status)
      setIsConnecting(false)
    }
    fetchHealth()
    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (questionId === 'q1') {
      const greeting = getAIResponsesForQuestion('greeting')[0]?.question
      if (greeting) {
        setMessages([greeting])
      }
    }
  }, [questionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const simulateTyping = (question: AIQuestion) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, question])
    }, 1000 + Math.random() * 500)
  }

  const requestHint = () => {
    const responses = getAIResponsesForQuestion(questionId)
    const hint = responses.find(r => r.relatedTo === 'hint')
    if (hint) {
      simulateTyping(hint.question)
    }
  }

  const sendEncouragement = () => {
    const encouragement = getRandomEncouragement()
    simulateTyping(encouragement)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = inputMessage.trim()
    setInputMessage('')

    // Add user message to chat
    const userMsg: AIQuestion = {
      id: `user-${Date.now()}`,
      type: 'general',
      content: userMessage,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMsg])

    // Show typing indicator
    setIsTyping(true)

    try {
      // Get context from parent (this would need to be passed as prop)
      // For now, use a basic context
      const context = {
        question_text: 'Coding problem',
        difficulty: 'medium',
        constraints: 'No constraints',
        input_format: 'Not specified',
        output_format: 'Not specified'
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/interviewer/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          message: userMessage,
          context,
          conversation_history: messages.map((m, i) => ({
            role: m.id.startsWith('user-') ? 'user' : 'assistant',
            content: m.content
          }))
        })
      })

      const data = await response.json()

      // Add AI response
      const aiResponse: AIQuestion = {
        id: `ai-${Date.now()}`,
        type: data.type || 'general',
        content: data.reply,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorResponse: AIQuestion = {
        id: `error-${Date.now()}`,
        type: 'general',
        content: 'Sorry, I could not connect to the AI interviewer. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className={cn(
      'flex flex-col h-full',
      theme === 'dark' 
        ? 'bg-card/50' 
        : 'bg-white',
      'rounded-xl border',
      theme === 'dark' ? 'border-border' : 'border-slate-200',
      className
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 border-b",
        theme === 'dark' ? 'border-border' : 'border-slate-200'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center",
            theme === 'dark' ? 'bg-primary/10' : 'bg-slate-100'
          )}>
            <Bot className={cn("w-5 h-5", theme === 'dark' ? 'text-primary' : 'text-slate-600')} />
          </div>
          <div>
            <div className={cn(
              "text-sm font-semibold",
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              AI Interviewer
            </div>
            <div             className={cn(
              "text-xs flex items-center gap-1",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full bg-green-500"
              )} />
              Online (Local AI)
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            theme === 'dark' 
              ? 'hover:bg-secondary' 
              : 'hover:bg-slate-100'
          )}
        >
          {isExpanded ? (
            <ChevronUp className={cn("w-4 h-4", theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
          ) : (
            <ChevronDown className={cn("w-4 h-4", theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
          )}
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {/* Messages Container */}
            <div className={cn(
              "flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin",
              theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50'
            )}>
              {messages.length === 0 && (
                <div className={cn(
                  "text-center py-8 text-sm",
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )}>
                  Ask for hints or tips during your exam.
                </div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    theme === 'dark' ? 'bg-primary/10' : 'bg-slate-100'
                  )}>
                    <Bot className={cn("w-4 h-4", theme === 'dark' ? 'text-primary' : 'text-slate-600')} />
                  </div>

                  <div className={cn(
                    'flex-1 px-4 py-3 rounded-xl rounded-tl-sm',
                    'border',
                    theme === 'dark' 
                      ? 'bg-card border-border' 
                      : 'bg-white border-slate-200'
                  )}>
                    <p className={cn(
                      "text-sm",
                      theme === 'dark' ? 'text-white' : 'text-slate-700'
                    )}>
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    theme === 'dark' ? 'bg-primary/10' : 'bg-slate-100'
                  )}>
                    <Bot className={cn("w-4 h-4", theme === 'dark' ? 'text-primary' : 'text-slate-600')} />
                  </div>
                  <div className={cn(
                    "px-4 py-3 rounded-xl rounded-tl-sm",
                    "border",
                    theme === 'dark' 
                      ? 'bg-card border-border' 
                      : 'bg-white border-slate-200'
                  )}>
                    <div className="flex gap-1">
                      <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        theme === 'dark' ? 'bg-slate-500' : 'bg-slate-400'
                      )} />
                      <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        theme === 'dark' ? 'bg-slate-500' : 'bg-slate-400'
                      )} style={{ animationDelay: '200ms' }} />
                      <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        theme === 'dark' ? 'bg-slate-500' : 'bg-slate-400'
                      )} style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Actions */}
            <div className={cn(
              "p-4 border-t space-y-2",
              theme === 'dark' ? 'border-border bg-card' : 'border-slate-200 bg-white'
            )}>
              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inputMessage.trim() && handleSendMessage()}
                  placeholder="Ask a question..."
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm border",
                    theme === 'dark'
                      ? 'bg-secondary border-border text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  )}
                />
                <button
                  onClick={() => inputMessage.trim() && handleSendMessage()}
                  disabled={!inputMessage.trim()}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    inputMessage.trim()
                      ? theme === 'dark'
                        ? 'bg-primary text-white hover:bg-primary/80'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      : theme === 'dark'
                        ? 'bg-secondary text-slate-500 cursor-not-allowed'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={requestHint}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
                    'text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  )}
                >
                  <Lightbulb className="w-4 h-4" />
                  Request Hint
                </button>
                <button
                  onClick={sendEncouragement}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
                    'text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-secondary text-slate-300 hover:bg-secondary/80'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  <Send className="w-4 h-4" />
                  Get Tip
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export interface AIQuestion {
  id: string
  type: 'greeting' | 'question' | 'hint' | 'feedback' | 'encouragement' | 'warning'
  content: string
  timestamp: number
  suggestedTime?: number
}

export interface AIResponse {
  question: AIQuestion
  relatedTo?: string
}

export const mockAIResponses: Record<string, AIResponse[]> = {
  greeting: [
    {
      question: {
        id: 'greet-1',
        type: 'greeting',
        content: "Welcome to your coding interview! I'm your AI interviewer. I'll be monitoring your progress and providing guidance throughout the session. Let's start with some coding challenges. Ready?",
        timestamp: Date.now(),
      },
    },
  ],
  'q1': [
    {
      question: {
        id: 'q1-hint-1',
        type: 'hint',
        content: "Consider using a hash map to store the complement of each number as you iterate through the array. This way, you can check if the complement exists in O(1) time.",
        timestamp: Date.now(),
      },
      relatedTo: 'hint',
    },
    {
      question: {
        id: 'q1-feedback-1',
        type: 'feedback',
        content: "Good start! Remember to handle edge cases like when the array has only two elements.",
        timestamp: Date.now(),
      },
      relatedTo: 'partial',
    },
  ],
  'q2': [
    {
      question: {
        id: 'q2-hint-1',
        type: 'hint',
        content: "This is a classic dynamic programming problem. Consider maintaining an array where dp[i] represents the length of LIS ending at index i.",
        timestamp: Date.now(),
      },
      relatedTo: 'hint',
    },
    {
      question: {
        id: 'q2-hint-2',
        type: 'hint',
        content: "You can also use binary search for an O(n log n) solution. Maintain a tails array where tails[i] is the smallest tail element for LIS of length i+1.",
        timestamp: Date.now(),
      },
      relatedTo: 'stuck',
    },
  ],
  'q3': [
    {
      question: {
        id: 'q3-hint-1',
        type: 'hint',
        content: "Think about using Breadth-First Search (BFS) for level order traversal. Use a queue to process nodes level by level.",
        timestamp: Date.now(),
      },
      relatedTo: 'hint',
    },
    {
      question: {
        id: 'q3-hint-2',
        type: 'hint',
        content: "For each level, process all nodes in the queue before moving to the next level. Keep track of the queue size to know when a level ends.",
        timestamp: Date.now(),
      },
      relatedTo: 'stuck',
    },
  ],
  encouragement: [
    {
      question: {
        id: 'enc-1',
        type: 'encouragement',
        content: "Great job! You're making excellent progress. Keep up the good work!",
        timestamp: Date.now(),
      },
    },
    {
      question: {
        id: 'enc-2',
        type: 'encouragement',
        content: "You're doing fantastic! Take your time and think through each problem carefully.",
        timestamp: Date.now(),
      },
    },
    {
      question: {
        id: 'enc-3',
        type: 'encouragement',
        content: "Excellent approach! Your solution looks clean and efficient.",
        timestamp: Date.now(),
      },
    },
  ],
  warnings: [
    {
      question: {
        id: 'warn-1',
        type: 'warning',
        content: "I've noticed you might be stuck. Would you like a hint? Type 'hint' to get some guidance.",
        timestamp: Date.now(),
      },
    },
    {
      question: {
        id: 'warn-2',
        type: 'warning',
        content: "Your code is taking longer than expected. Consider reviewing your approach or checking for infinite loops.",
        timestamp: Date.now(),
      },
    },
  ],
}

export function getAIResponsesForQuestion(questionId: string): AIResponse[] {
  return mockAIResponses[questionId] || []
}

export function getRandomEncouragement(): AIQuestion {
  const encouragements = mockAIResponses.encouragement
  const randomIndex = Math.floor(Math.random() * encouragements.length)
  return encouragements[randomIndex].question
}

export function getHintForQuestion(questionId: string, attemptLevel: number = 1): AIQuestion | null {
  const responses = mockAIResponses[questionId]
  if (!responses) return null
  
  const hints = responses.filter(r => r.relatedTo === 'hint')
  if (hints.length === 0) return null
  
  const hintIndex = Math.min(attemptLevel - 1, hints.length - 1)
  return hints[hintIndex].question
}

export function getFeedbackForAnswer(questionId: string, isCorrect: boolean, score: number): AIQuestion {
  if (isCorrect) {
    return {
      id: `feedback-${questionId}-correct`,
      type: 'feedback',
      content: score >= 100 
        ? "Perfect! All test cases passed with optimal time complexity!"
        : `Great work! Your solution passed all test cases with a score of ${score}/100.`,
      timestamp: Date.now(),
    }
  } else if (score >= 70) {
    return {
      id: `feedback-${questionId}-partial`,
      type: 'feedback',
      content: `Good effort! Your solution passed ${score}% of test cases. Some edge cases might need attention.`,
      timestamp: Date.now(),
    }
  } else {
    return {
      id: `feedback-${questionId}-low`,
      type: 'feedback',
      content: `Your solution passed ${score}% of test cases. Consider reviewing the problem constraints and edge cases.`,
      timestamp: Date.now(),
    }
  }
}

export const interviewTips: AIQuestion[] = [
  {
    id: 'tip-1',
    type: 'encouragement',
    content: "💡 Tip: Always read the problem statement twice before starting. Understanding constraints can help you choose the right approach.",
    timestamp: Date.now(),
  },
  {
    id: 'tip-2',
    type: 'encouragement',
    content: "💡 Tip: Start with a brute force solution, then optimize. It's okay to have an inefficient first attempt!",
    timestamp: Date.now(),
  },
  {
    id: 'tip-3',
    type: 'encouragement',
    content: "💡 Tip: Test your code with the provided examples before submitting. This helps catch obvious bugs.",
    timestamp: Date.now(),
  },
]

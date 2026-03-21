import { create } from 'zustand'
import type { TimelineEvent } from '../components/proctoring/Timeline'
import type { AIProctorState, AIAlert } from '../services/ai-proctor-types'

export type Language = 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust'

export interface TestCase {
  input: string
  expected: string
  visible: boolean
}

export interface Example {
  input: string
  output: string
  explanation?: string
}

export interface Question {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'mcq' | 'code' | 'essay'
  question: string
  constraints?: string[]
  examples?: Example[]
  testCases?: TestCase[]
  allowedLanguages?: Language[]
  starterCode?: string | Record<Language, string>
  language?: string
  options?: Array<{ id: string; text: string }>
  minWords?: number
  maxWords?: number
}

interface ExamState {
  testId: string | null
  candidateId: string | null
  candidateName: string
  questions: Question[]
  currentQuestionIndex: number
  answers: Map<string, string>
  flagged: Set<string>
  warnings: Array<{ id: string; type: 'minor' | 'major' | 'critical'; message: string; timestamp: Date }>
  totalTime: number
  startTime: Date | null
  status: 'idle' | 'login' | 'precheck' | 'exam' | 'submitted' | 'disqualified'
  proctorStatus: 'idle' | 'active' | 'warning' | 'critical'
  focusLossCount: number
  totalTimeOutside: number
  forbiddenProcesses: string[]
  devToolsAccessed: boolean
  timeline: TimelineEvent[]
  strikeCount: number
  disqualificationReason: string | null
  lastViolationTime: number
  showWarningDialog: boolean
  lastStrikeReason: string | null
  
  aiProctorState: AIProctorState | null
  aiStream0: MediaStream | null
  aiStream1: MediaStream | null
  
  setAIProctorState: (state: AIProctorState | null) => void
  setAIStreams: (stream0: MediaStream | null, stream1: MediaStream | null) => void
  handleAIAlert: (alert: AIAlert) => void
  
  setLogin: (testId: string, candidateId: string) => void
  setCandidateName: (name: string) => void
  setQuestions: (questions: Question[], totalTime: number) => void
  setCurrentQuestion: (index: number) => void
  setAnswer: (questionId: string, answer: string) => void
  toggleFlag: (questionId: string) => void
  addWarning: (warning: Omit<ExamState['warnings'][0], 'id' | 'timestamp'>) => void
  dismissWarning: (id: string) => void
  addTimelineEvent: (event: Omit<TimelineEvent, 'id'>) => void
  updateFocusStats: (lossCount: number, timeOutside: number) => void
  setProctorStatus: (status: ExamState['proctorStatus']) => void
  addForbiddenProcess: (processName: string) => void
  setDevToolsAccessed: (accessed: boolean) => void
  addStrike: (reason: string) => void
  dismissWarningDialog: () => void
  disqualify: (reason: string) => void
  startExam: () => void
  submitExam: () => void
  reset: () => void
}

let eventIdCounter = 0

export const useExamStore = create<ExamState>((set, get) => ({
  testId: null,
  candidateId: null,
  candidateName: '',
  questions: [],
  currentQuestionIndex: 0,
  answers: new Map(),
  flagged: new Set(),
  warnings: [],
  totalTime: 0,
  startTime: null,
  status: 'idle',
  proctorStatus: 'idle',
  focusLossCount: 0,
  totalTimeOutside: 0,
  forbiddenProcesses: [],
  devToolsAccessed: false,
  timeline: [],
  strikeCount: 0,
  disqualificationReason: null,
  lastViolationTime: 0,
  showWarningDialog: false,
  lastStrikeReason: null,
  aiProctorState: null,
  aiStream0: null,
  aiStream1: null,

  setAIProctorState: (state) => set({ aiProctorState: state }),
  
  setAIStreams: (stream0, stream1) => set({ aiStream0: stream0, aiStream1: stream1 }),
  
  handleAIAlert: (alert) => {
    const { addWarning, addStrike, addTimelineEvent, status } = get()
    
    if (status !== 'exam' && status !== 'precheck') return
    
    console.log('[AI Alert]', alert)
    
    addTimelineEvent({
      timestamp: new Date(alert.timestamp * 1000),
      type: 'warning',
      title: `AI: ${alert.type}`,
      details: alert.message,
      severity: alert.type === 'CRITICAL' ? 'critical' : 'warning',
    })
    
    if (alert.type === 'CRITICAL') {
      addStrike(`AI: ${alert.message}`)
    } else {
      addWarning({
        type: alert.type === 'SUSPICIOUS' ? 'major' : 'minor',
        message: `AI: ${alert.message}`,
      })
    }
  },

  setLogin: (testId, candidateId) => set({ testId, candidateId, status: 'precheck' }),
  
  setCandidateName: (name) => set({ candidateName: name }),
  
  setQuestions: (questions, totalTime) => set({ questions, totalTime }),
  
  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),
  
  setAnswer: (questionId, answer) => {
    const { answers } = get()
    const newAnswers = new Map(answers)
    newAnswers.set(questionId, answer)
    set({ answers: newAnswers })
  },
  
  toggleFlag: (questionId) => {
    const { flagged } = get()
    const newFlagged = new Set(flagged)
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId)
    } else {
      newFlagged.add(questionId)
    }
    set({ flagged: newFlagged })
  },
  
  addWarning: (warning) => {
    const { warnings, proctorStatus } = get()
    const newWarning = {
      ...warning,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    const newWarnings = [...warnings, newWarning]
    
    let newStatus = proctorStatus
    if (warning.type === 'critical' || newWarnings.filter(w => w.type === 'critical').length >= 3) {
      newStatus = 'critical'
    } else if (warning.type === 'major' || newWarnings.filter(w => w.type === 'major' || w.type === 'critical').length >= 2) {
      newStatus = 'warning'
    }
    
    set({ warnings: newWarnings, proctorStatus: newStatus })
  },
  
  dismissWarning: (id) => {
    const { warnings } = get()
    set({ warnings: warnings.filter((w) => w.id !== id) })
  },
  
  addTimelineEvent: (event) => {
    const { timeline } = get()
    const newEvent: TimelineEvent = {
      ...event,
      id: `event-${++eventIdCounter}`,
    }
    set({ timeline: [...timeline, newEvent] })
  },
  
  updateFocusStats: (lossCount, timeOutside) => {
    set({ focusLossCount: lossCount, totalTimeOutside: timeOutside })
  },
  
  setProctorStatus: (status) => set({ proctorStatus: status }),
  
  addForbiddenProcess: (processName) => {
    const { forbiddenProcesses } = get()
    if (!forbiddenProcesses.includes(processName)) {
      set({ forbiddenProcesses: [...forbiddenProcesses, processName] })
    }
  },
  
  setDevToolsAccessed: (accessed) => set({ devToolsAccessed: accessed }),
  
  addStrike: (reason) => {
    const { strikeCount, addWarning, addTimelineEvent, disqualify, lastViolationTime, status } = get()
    
    const now = Date.now()
    const cooldown = 3000
    
    if (status !== 'exam' && status !== 'disqualified') {
      return
    }
    
    if ((now - lastViolationTime) < cooldown) {
      console.log('[Strike] Cooldown active, skipping violation:', reason)
      return
    }
    
    const newStrikeCount = strikeCount + 1
    
    addWarning({
      type: 'critical',
      message: `Strike ${newStrikeCount}/3: ${reason}`,
    })
    
    addTimelineEvent({
      timestamp: new Date(),
      type: 'warning',
      title: `Strike ${newStrikeCount}/3`,
      details: reason,
      severity: 'critical',
    })
    
    if (newStrikeCount >= 3) {
      disqualify(reason)
    } else {
      set({ 
        strikeCount: newStrikeCount, 
        lastViolationTime: now,
        lastStrikeReason: reason,
        showWarningDialog: true,
      })
      
      if (window.electronAPI) {
        window.electronAPI.proctor.logEvent({
          type: 'strike_added',
          data: { strikeCount: newStrikeCount, reason }
        })
      }
    }
  },

  dismissWarningDialog: () => {
    set({ showWarningDialog: false })
  },
  
  disqualify: (reason) => {
    const { addTimelineEvent } = get()
    const now = Date.now()
    
    addTimelineEvent({
      timestamp: new Date(),
      type: 'warning',
      title: 'DISQUALIFIED',
      details: `Candidate disqualified: ${reason}`,
      severity: 'critical',
    })
    
    set({ 
      status: 'disqualified',
      disqualificationReason: reason,
      proctorStatus: 'critical',
      lastViolationTime: now,
      showWarningDialog: false,
      lastStrikeReason: reason,
    })
    
    if (window.electronAPI) {
      window.electronAPI.proctor.logEvent({
        type: 'candidate_disqualified',
        data: { reason }
      })
    }
  },
  
  startExam: () => {
    const { addTimelineEvent } = get()
    addTimelineEvent({
      timestamp: new Date(),
      type: 'start',
      title: 'Exam Started',
      details: 'Candidate began the examination',
      severity: 'info',
    })
    set({ 
      status: 'exam', 
      startTime: new Date(), 
      proctorStatus: 'active', 
      strikeCount: 0,
      disqualificationReason: null,
      showWarningDialog: false,
      lastStrikeReason: null,
      forbiddenProcesses: [],
      devToolsAccessed: false,
    })
  },
  
  submitExam: () => {
    const { addTimelineEvent, disqualificationReason, status } = get()
    
    if (status !== 'disqualified') {
      addTimelineEvent({
        timestamp: new Date(),
        type: 'submit',
        title: 'Exam Submitted',
        details: 'Candidate submitted their answers',
        severity: 'info',
      })
    }
    
    set({ 
      status: 'submitted', 
      proctorStatus: 'idle', 
      showWarningDialog: false,
    })
  },
  
  reset: () => set({
    testId: null,
    candidateId: null,
    candidateName: '',
    currentQuestionIndex: 0,
    answers: new Map(),
    flagged: new Set(),
    warnings: [],
    totalTime: 0,
    startTime: null,
    status: 'idle',
    proctorStatus: 'idle',
    focusLossCount: 0,
    totalTimeOutside: 0,
    forbiddenProcesses: [],
    devToolsAccessed: false,
    timeline: [],
    strikeCount: 0,
    disqualificationReason: null,
    lastViolationTime: 0,
    showWarningDialog: false,
    lastStrikeReason: null,
    aiProctorState: null,
    aiStream0: null,
    aiStream1: null,
  }),
}))

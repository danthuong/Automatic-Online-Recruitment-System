/**
 * Interview API Service
 * Handles communication with the backend for 5-question coding interview.
 */

import type { Question } from '@/renderer/store/examStore'

// Use the new backend API URL (from environment or default to the new server)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://10.18.151.50:5000/api/v1'

// Store auth token in memory (cleared on page refresh)
let authToken: string | null = null

// Types for candidate profile from the new API
export interface CandidateProfile {
  id: string
  userId: string
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  phone?: string
  resumeUrl?: string
  githubUrl?: string
  faceImageUrl?: string
  cvUrl?: string
  parsedCvData?: {
    skills: string[]
    experience: Array<{
      company: string
      position: string
      duration: string
    }>
    education: Array<{
      school: string
      degree: string
      year: string
    }>
  }
  skills?: string[]
  experience?: number
  education?: string
  linkedInUrl?: string
  portfolioUrl?: string
  wowScore?: number
}

// Types for the interview API
export interface GitHubProfileData {
  username: string
  repositories: Array<{
    name: string
    description?: string
    stars: number
    language?: string
  }>
  bio?: string
  name?: string
}

export interface InterviewGenerateRequest {
  candidate_name: string
  github_profile_data?: GitHubProfileData
  job_description?: string
  cv_content?: string
}

export interface InterviewQuestion {
  id: number
  type: string
  difficulty?: string
  title: string
  description: string
  test_cases?: Array<{
    input: string
    expected_output: string
  }>
  repo_data?: {
    username: string
    repositories: Array<{
      name: string
      description?: string
      stars: number
      language?: string
    }>
  }
}

export interface InterviewGenerateResponse {
  candidate_name: string
  questions: InterviewQuestion[]
}

export interface ExecuteCodeRequest {
  user_code: string
  problem_id: number
}

export interface TestResult {
  test_case: number
  passed: boolean
  input: string
  expected: string
  actual: string
  error?: string
}

export interface ExecuteCodeResponse {
  problem_id: number
  pass_percentage: number
  complexity?: number
  test_results: TestResult[]
}

export interface EvaluateWritingRequest {
  question_text: string
  user_answer: string
}

export interface EvaluateWritingResponse {
  score: number
  feedback: string
}

/**
 * Login to the backend API with candidate credentials
 * Uses testId (email) and candidateId (password)
 */
export async function loginToBackend(
  testId: string,
  candidateId: string
): Promise<{ accessToken: string; user: { email: string; role: string } }> {
  // The testId is actually the email (from web portal registration)
  // The candidateId is actually the password
  const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testId,  // Test ID input contains the email
      password: candidateId,  // Candidate ID input contains the password
    }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.data?.tokens?.accessToken) {
    authToken = data.data.tokens.accessToken
    return {
      accessToken: data.data.tokens.accessToken,
      user: data.data.user,
    }
  }

  throw new Error('Invalid login response')
}

/**
 * Get the stored auth token
 */
export function getAuthToken(): string | null {
  return authToken
}

/**
 * Fetch candidate profile from the backend
 * This includes CV URL, JD URL, skills, etc.
 */
export async function fetchCandidateProfile(): Promise<CandidateProfile> {
  if (!authToken) {
    throw new Error('Not authenticated. Please login first.')
  }

  const response = await fetch(`${BACKEND_API_URL}/users/me/candidate-profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * Fetch a file (CV or JD) from the backend
 * @param filePath - The file path from the profile (e.g., "files/some_thing_abcd")
 */
export async function fetchFile(filePath: string): Promise<Blob> {
  if (!authToken) {
    throw new Error('Not authenticated. Please login first.')
  }

  const response = await fetch(`${BACKEND_API_URL}/${filePath}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`)
  }

  return response.blob()
}

/**
 * Download CV as text (parses PDF/DOCX on backend or returns raw text)
 * Returns the CV content as a string
 */
export async function fetchCVContent(): Promise<string> {
  const profile = await fetchCandidateProfile()

  if (!profile.cvUrl) {
    console.log('[interview-api] No CV URL in profile')
    return ''
  }

  try {
    const blob = await fetchFile(profile.cvUrl)
    // For now, return as text. The backend might return PDF/DOCX
    // In a real implementation, you'd parse this on the backend
    const text = await blob.text()
    return text
  } catch (error) {
    console.error('[interview-api] Failed to fetch CV:', error)
    return ''
  }
}

/**
 * Generate interview questions using candidate profile data
 * This is the main function that combines CV + profile data
 */
export async function generateInterviewFromProfile(
  candidateName: string,
  cvContent?: string,
  githubUrl?: string,
  jobDescription?: string
): Promise<InterviewGenerateResponse> {
  // Build the request with profile data
  const request: InterviewGenerateRequest = {
    candidate_name: candidateName,
    // GitHub data can be extracted from profile.githubUrl
    github_profile_data: githubUrl ? await fetchGitHubProfileFromUrl(githubUrl) : undefined,
    job_description: jobDescription,
    // CV content for essay questions
    cv_content: cvContent,
  }

  const response = await fetch(`${API_BASE_URL}/api/interview/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate interview: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Extract GitHub username from URL and fetch profile
 */
async function fetchGitHubProfileFromUrl(githubUrl: string): Promise<GitHubProfileData | undefined> {
  // Extract username from URL like https://github.com/username
  const match = githubUrl.match(/github\.com\/([^\/]+)/)
  if (!match) return undefined

  const username = match[1]
  return fetchGitHubProfile(username)
}

/**
 * Generate interview questions from the backend
 */
export async function generateInterview(
  candidateName: string,
  githubData?: GitHubProfileData,
  jobDescription?: string
): Promise<InterviewGenerateResponse> {
  const request: InterviewGenerateRequest = {
    candidate_name: candidateName,
    github_profile_data: githubData,
    job_description: jobDescription,
  }

  const response = await fetch(`${API_BASE_URL}/api/interview/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate interview: ${response.statusText}`)
  }

  return response.json()
}

// Types for Node.js Test API response
export interface NodeJSTestCase {
  input: string
  output: string
  isHidden?: boolean
}

export interface NodeJSQuestion {
  id: string
  testId: string
  type: 'code' | 'mcq' | 'essay'
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  content: string
  constraints: string[]
  examples: Array<{
    input: string
    output: string
    explanation?: string
  }>
  testCases: NodeJSTestCase[]
  allowedLanguages: string[]
}

export interface NodeJSTest {
  id: string
  testId: string
  questions: NodeJSQuestion[]
}

/**
 * Fetch test by ID from the Node.js server
 */
export async function fetchTestById(testId: string): Promise<NodeJSTest> {
  const response = await fetch(`${BACKEND_API_URL}/tests/testid/${testId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Test not found. Please check your Test ID.')
    }
    throw new Error(`Failed to fetch test: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Convert Node.js question format to Electron app's Question format
 */
export function convertNodeJSToAppQuestion(nodeQuestion: NodeJSQuestion): Question {
  const testCases = nodeQuestion.testCases?.map((tc, idx) => ({
    input: tc.input,
    expected: tc.output,
    visible: !tc.isHidden,
  })) || []

  return {
    id: nodeQuestion.id,
    title: nodeQuestion.title,
    difficulty: nodeQuestion.difficulty,
    type: nodeQuestion.type,
    question: nodeQuestion.content,
    constraints: nodeQuestion.constraints,
    examples: nodeQuestion.examples,
    testCases: testCases,
    allowedLanguages: nodeQuestion.allowedLanguages as any,
    language: nodeQuestion.allowedLanguages?.[0] || 'python',
  }
}

/**
 * Execute code against test cases
 */
export async function executeCode(
  userCode: string,
  problemId: string | number
): Promise<ExecuteCodeResponse> {
  const request: ExecuteCodeRequest = {
    user_code: userCode,
    problem_id: typeof problemId === 'string' ? parseInt(problemId, 10) : problemId,
  }

  const response = await fetch(`${API_BASE_URL}/api/interview/execute_code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Failed to execute code: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Evaluate written answer
 */
export async function evaluateWriting(
  questionText: string,
  userAnswer: string
): Promise<EvaluateWritingResponse> {
  const request: EvaluateWritingRequest = {
    question_text: questionText,
    user_answer: userAnswer,
  }

  const response = await fetch(`${API_BASE_URL}/api/interview/evaluate_writing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Failed to evaluate writing: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Convert backend question format to Electron app's Question format
 * Also formats the ugly problem description into structured sections
 */
export function convertToAppQuestion(backendQuestion: InterviewQuestion): Question {
  const formattedDescription = formatProblemDescription(backendQuestion.description)

  if (backendQuestion.type === 'code') {
    // Extract test cases from backend format
    const testCases = backendQuestion.test_cases?.map((tc, idx) => ({
      input: tc.input,
      expected: tc.expected_output,
      visible: idx < 2, // First 2 test cases visible
    })) || []

    // Extract examples from description (simplified)
    const examples = extractExamples(backendQuestion.description).map(ex => ({
      input: ex.input,
      output: ex.output,
      explanation: ex.explanation,
    }))

    // Extract constraints
    const constraints = extractConstraints(backendQuestion.description)

    return {
      id: `q${backendQuestion.id}`,
      title: backendQuestion.title,
      difficulty: (backendQuestion.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
      type: 'code',
      question: formattedDescription.fullText, // Use the full formatted text
      constraints,
      examples,
      testCases,
      allowedLanguages: ['python'],
      starterCode: {
        python: generateStarterCode(backendQuestion.title),
        javascript: generateStarterCode(backendQuestion.title),
        java: generateStarterCode(backendQuestion.title),
        cpp: generateStarterCode(backendQuestion.title),
        go: generateStarterCode(backendQuestion.title),
        rust: generateStarterCode(backendQuestion.title),
      } as Record<string, string>,
    }
  } else if (backendQuestion.type === 'github') {
    return {
      id: `q${backendQuestion.id}`,
      title: backendQuestion.title,
      difficulty: 'medium',
      type: 'essay',
      question: backendQuestion.description,
      minWords: 50,
      maxWords: 500,
    }
  } else {
    // JD question
    return {
      id: `q${backendQuestion.id}`,
      title: backendQuestion.title,
      difficulty: 'medium',
      type: 'essay',
      question: backendQuestion.description,
      minWords: 50,
      maxWords: 500,
    }
  }
}

/**
 * Format the ugly problem description into structured sections
 * Uses AI-like formatting to separate Input, Output, Example sections
 */
function formatProblemDescription(rawDescription: string): {
  fullText: string
  sections: {
    problem: string
    input: string
    output: string
    note?: string
  }
} {
  let sections = {
    problem: '',
    input: '',
    output: '',
    note: undefined as string | undefined,
  }

  // Split by common section headers
  const parts = rawDescription.split(/(?:-----Input-----|-----Output-----|-----Note-----|-----Examples-----)/i)

  if (parts.length >= 2) {
    sections.problem = parts[0].trim()
    sections.input = parts[1]?.trim() || ''

    if (parts[2]) {
      sections.output = parts[2].trim()
    }
    if (parts[3]) {
      sections.note = parts[3].trim()
    }
  } else {
    // If no clear sections, try to parse heuristically
    sections = parseHeuristicDescription(rawDescription)
  }

  // Build full formatted text
  const fullText = buildFormattedText(sections)

  return { fullText, sections }
}

/**
 * Parse description heuristically when no clear sections
 */
function parseHeuristicDescription(text: string): { problem: string; input: string; output: string; note: string | undefined } {
  const lines = text.split('\n')
  const sections: { problem: string; input: string; output: string; note: string | undefined } = {
    problem: '',
    input: '',
    output: '',
    note: undefined,
  }

  let currentSection = 'problem'
  const sectionContents: string[] = []

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim()

    if (lowerLine.includes('input:') || lowerLine.startsWith('input ')) {
      // Save previous section
      if (sectionContents.length > 0) {
        if (currentSection === 'problem') sections.problem = sectionContents.join('\n')
        else if (currentSection === 'input') sections.input = sectionContents.join('\n')
        else if (currentSection === 'output') sections.output = sectionContents.join('\n')
      }
      currentSection = 'input'
      sectionContents.length = 0

      // Remove the header from content
      const content = line.replace(/input:?\s*/i, '').trim()
      if (content) sectionContents.push(content)
    } else if (lowerLine.includes('output:') || lowerLine.startsWith('output ')) {
      if (sectionContents.length > 0) {
        if (currentSection === 'problem') sections.problem = sectionContents.join('\n')
        else if (currentSection === 'input') sections.input = sectionContents.join('\n')
        else if (currentSection === 'output') sections.output = sectionContents.join('\n')
      }
      currentSection = 'output'
      sectionContents.length = 0

      const content = line.replace(/output:?\s*/i, '').trim()
      if (content) sectionContents.push(content)
    } else if (lowerLine.includes('example:') || lowerLine.startsWith('example')) {
      if (sectionContents.length > 0) {
        if (currentSection === 'problem') sections.problem = sectionContents.join('\n')
        else if (currentSection === 'input') sections.input = sectionContents.join('\n')
        else if (currentSection === 'output') sections.output = sectionContents.join('\n')
      }
      currentSection = 'note'
      sectionContents.length = 0

      const content = line.replace(/example:?\s*/i, '').trim()
      if (content) sectionContents.push(content)
    } else {
      sectionContents.push(line)
    }
  }

  // Save last section
  if (sectionContents.length > 0) {
    if (currentSection === 'problem') sections.problem = sectionContents.join('\n')
    else if (currentSection === 'input') sections.input = sectionContents.join('\n')
    else if (currentSection === 'output') sections.output = sectionContents.join('\n')
    else if (currentSection === 'note') sections.note = sectionContents.join('\n')
  }

  // If still empty, use the whole text as problem
  if (!sections.problem && !sections.input && !sections.output) {
    sections.problem = text
  }

  return sections
}

/**
 * Build nicely formatted text with proper sections
 */
function buildFormattedText(sections: { problem: string; input: string; output: string; note?: string }): string {
  const parts: string[] = []

  if (sections.problem) {
    parts.push(`📝 **Problem**\n${sections.problem}`)
  }

  if (sections.input) {
    parts.push(`\n📥 **Input**\n${sections.input}`)
  }

  if (sections.output) {
    parts.push(`\n📤 **Output**\n${sections.output}`)
  }

  if (sections.note) {
    parts.push(`\n📌 **Note**\n${sections.note}`)
  }

  return parts.join('\n')
}

/**
 * Extract examples from raw description
 */
function extractExamples(text: string): Array<{ input: string; output: string; explanation?: string }> {
  const examples: Array<{ input: string; output: string; explanation?: string }> = []

  // Look for Example blocks
  const examplePattern = /Example:?\s*[\s\S]*?(?=(?:-----|\n\n|$))/gi
  const matches = text.match(examplePattern)

  if (matches) {
    for (const match of matches) {
      const inputMatch = match.match(/Input:?\s*([\s\S]*?)(?:Output:|$)/i)
      const outputMatch = match.match(/Output:?\s*([\s\S]*?)(?:Explanation:|$)/i)
      const explanationMatch = match.match(/Explanation:?\s*([\s\S]*?)$/i)

      if (inputMatch && outputMatch) {
        examples.push({
          input: inputMatch[1].trim(),
          output: outputMatch[1].trim(),
          explanation: explanationMatch?.[1]?.trim(),
        })
      }
    }
  }

  return examples
}

/**
 * Extract constraints from raw description
 */
function extractConstraints(text: string): string[] {
  const constraints: string[] = []

  // Look for constraint lines (often start with constraints or have bullet points)
  const constraintPatterns = [
    /(?:Constraints?|1\.|•)\s*([^\n]+)/gi,
    /-\s*([^\n]+)/g,
  ]

  for (const pattern of constraintPatterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const constraint = match[1]?.trim()
      if (constraint && constraint.length > 3 && constraint.length < 100) {
        constraints.push(constraint)
      }
    }
  }

  return [...new Set(constraints)].slice(0, 5) // Limit to 5 constraints
}

/**
 * Generate starter code based on problem title
 */
function generateStarterCode(title: string): string {
  // Generic Python starter code
  return `def solution():
    # Write your solution here
    pass

if __name__ == "__main__":
    solution()`
}

/**
 * Fetch GitHub profile data for interview generation
 */
export async function fetchGitHubProfile(username: string): Promise<GitHubProfileData | undefined> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/github/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, max_repos: 10 }),
    })

    if (!response.ok) {
      console.error('Failed to fetch GitHub profile:', response.statusText)
      return undefined
    }

    const data = await response.json()

    return {
      username: data.profile.username,
      repositories: data.profile.repositories.map((r: any) => ({
        name: r.name,
        description: r.description,
        stars: r.stars,
        language: r.language,
      })),
      bio: data.profile.bio,
      name: data.profile.name,
    }
  } catch (error) {
    console.error('Error fetching GitHub profile:', error)
    return undefined
  }
}
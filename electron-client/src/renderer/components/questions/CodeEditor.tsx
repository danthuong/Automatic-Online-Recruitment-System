import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/renderer/components/ui/card'
import { cn } from '@/renderer/lib/utils'
import { Code, RotateCcw, Copy, Check, Play, ChevronDown } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import type { Language } from '@/renderer/store/examStore'

interface CodeEditorProps {
  question: string
  language?: string
  starterCode?: string | Record<Language, string>
  allowedLanguages?: Language[]
  value: string
  onChange: (value: string) => void
  onLanguageChange?: (language: Language) => void
  onReset?: () => void
  onRunTests?: () => void
  maxLines?: number
  className?: string
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rs',
  sql: 'sql',
  html: 'html',
  css: 'css',
  json: 'json',
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
]

export function CodeEditor({
  question,
  language = 'javascript',
  starterCode = '',
  allowedLanguages,
  value,
  onChange,
  onLanguageChange,
  onReset,
  onRunTests,
  maxLines = 20,
  className,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const [lineCount, setLineCount] = useState(1)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const currentLanguage = language as Language
  const languages = allowedLanguages 
    ? LANGUAGES.filter(l => allowedLanguages.includes(l.value))
    : LANGUAGES

  useEffect(() => {
    const lines = value.split('\n').length
    setLineCount(Math.max(lines, 5))
  }, [value])

  const handleLanguageChange = (newLang: Language) => {
    if (onLanguageChange) {
      onLanguageChange(newLang)
    }
    setShowLangDropdown(false)
  }

  const handleRunTests = async () => {
    if (!onRunTests) return
    setIsRunning(true)
    try {
      await onRunTests()
    } finally {
      setIsRunning(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const start = e.currentTarget.selectionStart
    const end = e.currentTarget.selectionEnd
    const newValue = value.substring(0, start) + pastedText + value.substring(end)
    onChange(newValue)
  }

  const extension = LANGUAGE_EXTENSIONS[language] || 'txt'
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1)

  return (
    <Card className={cn('overflow-hidden glass-panel', className)}>
      <CardHeader className="pb-4 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Coding Question
            </CardTitle>
            <CardDescription className="line-clamp-2">{question}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {languages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-sm font-medium transition-colors text-slate-300"
                >
                  {LANGUAGES.find(l => l.value === currentLanguage)?.label || currentLanguage}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showLangDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-slate-900/95 backdrop-blur-xl rounded-lg shadow-xl border border-slate-700/50 py-1 min-w-[140px]">
                    {languages.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => handleLanguageChange(lang.value)}
                        className={cn(
                          'w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors text-slate-300',
                          lang.value === currentLanguage && 'bg-primary/20 text-primary font-medium'
                        )}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onRunTests && (
              <Button
                variant="success"
                size="sm"
                onClick={handleRunTests}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Tests
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-[#1e1e1e] rounded-b-lg overflow-hidden border border-slate-700/30">
          <div className="flex">
            <div className="flex-shrink-0 py-4 px-2 bg-[#252526] text-right select-none border-r border-[#3c3c3c]">
              {lines.map((num) => (
                <div
                  key={num}
                  className="text-[#858585] text-sm font-mono leading-[21px] px-2"
                >
                  {num}
                </div>
              ))}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                className="w-full h-full min-h-[300px] p-4 bg-transparent text-[#d4d4d4] font-mono text-sm leading-[21px] resize-none focus:outline-none placeholder:text-[#6a6a6a] overflow-auto"
                style={{ tabSize: 2 }}
                placeholder={`// Write your ${language} code here...`}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-[#252526] border-t border-[#3c3c3c] text-xs text-[#858585]">
            <span className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#4e4e4e] text-[#d4d4d4] rounded">
                {language}
              </span>
              <span>file.{extension}</span>
            </span>
            <span>
              Lines: {lineCount} | Characters: {value.length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

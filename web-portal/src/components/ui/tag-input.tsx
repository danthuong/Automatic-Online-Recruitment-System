import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  label?: string
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  className?: string
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder = 'Type and press Enter',
  maxTags,
  className,
}: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed) return
    if (maxTags && value.length >= maxTags) return
    if (value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}
      <div
        className={cn(
          'flex flex-wrap gap-2 min-h-[42px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm',
          'focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary',
          'transition-all duration-200'
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-primary/70 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {maxTags && (
        <p className="text-xs text-muted-foreground">
          {value.length}/{maxTags} skills
        </p>
      )}
    </div>
  )
}

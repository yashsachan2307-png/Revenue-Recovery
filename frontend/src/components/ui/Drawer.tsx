import * as React from "react"
import { X } from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Drawer({ isOpen, onClose, title, children, className }: DrawerProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-[var(--color-ink)]/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div 
        className={cn(
          "fixed right-0 top-0 h-screen w-full max-w-2xl bg-[var(--color-paper)] border-l border-[var(--color-border-subtle)] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)] shrink-0 bg-[var(--color-paper)]">
          <h2 className="text-lg font-black uppercase tracking-widest">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-border-subtle)]/30 rounded-none transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-paper)]">
          {children}
        </div>
      </div>
    </>
  )
}

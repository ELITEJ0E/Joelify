"use client"

import { X, LucideIcon } from "lucide-react"
import { toast } from "sonner"

interface CustomToastProps {
  t: string | number
  title: string
  description?: string
  Icon: LucideIcon
  variant?: "success" | "info" | "error"
}

export function CustomToast({ t, title, description, Icon, variant = "success" }: CustomToastProps) {
  return (
    <div className="bg-black/90 backdrop-blur-2xl border border-primary/40 p-4 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)] flex items-start gap-3 min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-primary/20 p-2 rounded-lg">
        <Icon size={20} className="text-primary" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </div>
      <button 
        onClick={() => toast.dismiss(t)}
        className="text-gray-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

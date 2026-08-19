import type React from "react";

export function ChevronButton({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors">
            {children}
        </button>
    )
}
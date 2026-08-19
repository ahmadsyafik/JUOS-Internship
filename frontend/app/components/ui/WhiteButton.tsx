export function WhiteButton({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50"
        >
            {children}
        </button>
    )
}
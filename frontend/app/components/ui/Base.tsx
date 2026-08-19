export function Base({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-8 max-w-5xl mx-auto">
            {children}
        </div>
    );
}
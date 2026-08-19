export function ScreenHeader({ title, description }: { title: string, description?: string }) {
    return (
        <div className="mb-8">
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
            <p className="text-sm text-gray-400 mt-1">
                {description}
            </p>
        </div>
    );
}
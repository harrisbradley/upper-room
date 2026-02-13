export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)] dark:border-slate-700 dark:border-t-[var(--accent)]" />
    </div>
  );
}

export function PageLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <LoadingSpinner />
    </main>
  );
}

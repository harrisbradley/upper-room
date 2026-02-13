import { type ReactNode } from "react";

type ErrorMessageProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function ErrorMessage({
  title = "Something went wrong",
  children,
  className = "",
}: ErrorMessageProps) {
  return (
    <div
      className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200 ${className}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <ErrorMessage>{message}</ErrorMessage>
    </main>
  );
}

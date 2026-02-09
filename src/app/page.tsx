import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Upper Room
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Create and share Bible studies with a simple link. No sign-up required to get started.
        </p>
        <div className="mt-8">
          <Link href="/create">
            <Button variant="primary" size="lg">
              Create a study
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

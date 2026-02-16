"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Please enter a join code.");
      return;
    }
    setJoinError("");
    router.push(`/join/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Upper Room
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Create and share Bible studies with a simple link. No sign-up required.
        </p>

        {/* Create study CTA */}
        <div className="mt-8">
          <Link href="/create">
            <Button variant="primary" size="lg" className="w-full">
              Create a study
            </Button>
          </Link>
        </div>

        {/* Divider */}
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-sm text-slate-500 dark:text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Join with code */}
        <form onSubmit={handleJoin} className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Have a join code?
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setJoinError("");
              }}
              className="flex-1 text-center uppercase tracking-widest"
            />
            <Button type="submit" variant="outline">
              Join
            </Button>
          </div>
          {joinError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{joinError}</p>
          )}
        </form>
      </div>
    </main>
  );
}

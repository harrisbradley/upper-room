"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { createStudy } from "@/lib/services/studies";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a study name.");
      return;
    }
    setLoading(true);
    try {
      const { studyId } = await createStudy(trimmed);
      router.push(`/created/${studyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardTitle className="mb-4">Create a study</CardTitle>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          You’ll get a shareable link so others can join. No account needed.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Study name"
            placeholder="e.g. Romans small group"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

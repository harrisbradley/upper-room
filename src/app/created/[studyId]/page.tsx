"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { getStudy } from "@/lib/services/studies";

export default function CreatedPage() {
  const params = useParams();
  const studyId = params.studyId as string;
  const [study, setStudy] = useState<Awaited<ReturnType<typeof getStudy>>>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getStudy(studyId).then(setStudy).finally(() => setLoading(false));
  }, [studyId]);

  const shareUrl =
    typeof window !== "undefined" && study?.joinCode
      ? `${window.location.origin}/join/${study.joinCode}`
      : "";

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!study) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <p className="text-slate-600 dark:text-slate-400">Study not found.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Back home</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardTitle className="mb-2">Study created</CardTitle>
        <p className="mb-6 text-slate-600 dark:text-slate-400">{study.name}</p>
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Share this link so others can join:
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          />
          <Button
            variant="primary"
            size="md"
            onClick={copyToClipboard}
            disabled={!shareUrl}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Join code: <strong>{study.joinCode || "—"}</strong>
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back home
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

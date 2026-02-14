"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { getStudyByJoinCode } from "@/lib/services/join";
import { getNextSession } from "@/lib/services/studies";
import type { Study } from "@/lib/services/studies";
import type { Session } from "@/lib/services/studies";

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;
  const [study, setStudy] = useState<Study | null>(null);
  const [nextSession, setNextSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getStudyByJoinCode(code);
      if (cancelled) return;
      setStudy(s ?? null);
      if (s) {
        const { getNextSession: getNext } = await import("@/lib/services/studies");
        const session = await getNext(s.id);
        if (!cancelled) setNextSession(session ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleJoin() {
    if (!study) return;
    setJoining(true);
    try {
      const { joinStudy } = await import("@/lib/services/join");
      await joinStudy(study.id);
      setJoined(true);
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  if (!study) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <p className="text-slate-600 dark:text-slate-400">
            This invite link is invalid or has expired.
          </p>
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
        <CardTitle className="mb-2">You&apos;re invited</CardTitle>
        <p className="mb-2 text-lg font-medium text-slate-800 dark:text-slate-200">
          {study.name}
        </p>
        {nextSession && (
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            Next: {nextSession.title}
          </p>
        )}
        {!nextSession && (
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            No sessions scheduled yet.
          </p>
        )}
        {joined ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-100 py-3 text-center dark:bg-green-900/30">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                You&apos;ve joined this study!
              </p>
            </div>
            <Link href={`/s/${study.id}`}>
              <Button variant="primary" className="w-full">
                Go to study
              </Button>
            </Link>
          </div>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? "Joining..." : "Join study"}
          </Button>
        )}
        {!joined && (
          <div className="mt-6">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back home
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}

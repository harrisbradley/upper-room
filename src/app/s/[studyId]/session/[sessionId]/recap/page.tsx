"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, postRecap } from "@/lib/services/sessions";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

export default function RecapPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const [summary, setSummary] = useState("");
  const [takeawaysText, setTakeawaysText] = useState("");
  const [intentionsText, setIntentionsText] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      setError(null);

      try {
        const s = await getSession(studyId, sessionId);
        if (!s) {
          setLoadError("Session not found.");
          return;
        }

        setSummary(s.recap?.summary ?? "");
        setTakeawaysText((s.recap?.keyTakeaways ?? []).join("\n"));
        setIntentionsText((s.recap?.prayerIntentions ?? []).join("\n"));
      } catch (e: any) {
        setLoadError(e?.message ?? "Could not load recap.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId, sessionId]);

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPosted(false);
    setPosting(true);

    try {
      const user = await ensureAnonymousAuth();

      const keyTakeaways = takeawaysText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const prayerIntentions = intentionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await postRecap(studyId, sessionId, user.uid, {
        summary: summary.trim(),
        keyTakeaways,
        prayerIntentions,
      });
      setPosted(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not post recap.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardTitle className="mb-2">Could not open recap</CardTitle>
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          <div className="mt-5">
            <Link href={`/s/${studyId}`}>
              <Button variant="outline" className="w-full">
                Back to study
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Post session recap
        </h1>
        <Link href={`/s/${studyId}`}>
          <Button variant="outline">Back to study</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Recap details</CardTitle>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Capture what happened so participants can review and stay connected.
        </p>

        <form onSubmit={onPost} className="mt-5 grid gap-4">
          <Textarea
            label="Summary"
            placeholder="Summary of the discussion"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              setPosted(false);
            }}
            rows={7}
            disabled={posting}
          />

          <Textarea
            label="Key takeaways (one per line)"
            placeholder={"What God revealed...\nA practical step this week..."}
            value={takeawaysText}
            onChange={(e) => {
              setTakeawaysText(e.target.value);
              setPosted(false);
            }}
            rows={6}
            disabled={posting}
          />

          <Textarea
            label="Prayer intentions (one per line)"
            placeholder={"Pray for healing...\nPray for courage..."}
            value={intentionsText}
            onChange={(e) => {
              setIntentionsText(e.target.value);
              setPosted(false);
            }}
            rows={6}
            disabled={posting}
          />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          {posted && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
              Recap published.
            </p>
          )}

          <Button type="submit" disabled={posting || summary.trim().length === 0}>
            {posting ? "Posting..." : "Publish recap"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

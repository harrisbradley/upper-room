"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, postRecap } from "@/lib/services/sessions";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { ErrorMessage, PageError } from "@/components/ui/ErrorMessage";

export default function RecapPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const [summary, setSummary] = useState("");
  const [takeawaysText, setTakeawaysText] = useState("");
  const [intentionsText, setIntentionsText] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const s = await getSession(studyId, sessionId);
        if (!s) {
          setError("Session not found.");
          return;
        }

        setSummary(s.recap?.summary ?? "");
        setTakeawaysText((s.recap?.keyTakeaways ?? []).join("\n"));
        setIntentionsText((s.recap?.prayerIntentions ?? []).join("\n"));
      } catch (e: any) {
        setError(e?.message ?? "Could not load recap.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId, sessionId]);

  async function onPost() {
    setError(null);
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

      setPublished(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not post recap.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error && !summary && !takeawaysText)
    return <PageError message={error} />;

  // --- Published success state ---
  if (published) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
          <h1 className="text-xl font-bold text-green-800 dark:text-green-200">
            Recap published
          </h1>
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            Your group can now review the recap.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href={`/s/${studyId}/session/${sessionId}/recap/view`}>
              <Button size="sm">View recap</Button>
            </Link>
            <Link href={`/s/${studyId}`}>
              <Button variant="secondary" size="sm">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Post Session Recap
        </h1>
        <Link
          href={`/s/${studyId}`}
          className="text-sm text-slate-500 hover:text-[var(--accent)] dark:text-slate-400"
        >
          Back to study
        </Link>
      </div>

      <div className="mt-6 grid gap-5">
        <Textarea
          label="Summary of the discussion"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What did the group discuss? What was the main theme?"
          className="min-h-[140px]"
        />

        <Textarea
          label="Key takeaways (one per line)"
          value={takeawaysText}
          onChange={(e) => setTakeawaysText(e.target.value)}
          placeholder={"God's grace is sufficient\nWe are called to love our neighbor\nPrayer transforms our perspective"}
          className="min-h-[120px]"
        />

        <Textarea
          label="Prayer intentions (one per line)"
          value={intentionsText}
          onChange={(e) => setIntentionsText(e.target.value)}
          placeholder={"For healing and peace\nFor strength in difficult times\nFor unity in our community"}
          className="min-h-[120px]"
        />

        {error && <ErrorMessage title="Oops">{error}</ErrorMessage>}

        <Button
          onClick={onPost}
          disabled={posting || summary.trim().length === 0}
        >
          {posting ? "Publishing..." : "Publish recap"}
        </Button>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, postRecap } from "@/lib/services/sessions";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";

export default function RecapPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e: any) {
      setError(e?.message ?? "Could not post recap.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <main>Loading...</main>;
  if (error) return <main style={{ maxWidth: 760 }}>{error}</main>;

  return (
    <main style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Post Session Recap</h1>
        <Link href={`/s/${studyId}`}>Back to study</Link>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <textarea
          placeholder="Summary of the discussion"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={{ minHeight: 140, padding: 12 }}
        />

        <textarea
          placeholder="Key takeaways (one per line)"
          value={takeawaysText}
          onChange={(e) => setTakeawaysText(e.target.value)}
          style={{ minHeight: 120, padding: 12 }}
        />

        <textarea
          placeholder="Prayer intentions (one per line)"
          value={intentionsText}
          onChange={(e) => setIntentionsText(e.target.value)}
          style={{ minHeight: 120, padding: 12 }}
        />

        {error && <div style={{ color: "red" }}>{error}</div>}

        <Button onClick={onPost} disabled={posting || summary.trim().length === 0}>
          {posting ? "Posting..." : "Publish recap"}
        </Button>
      </div>
    </main>
  );
}

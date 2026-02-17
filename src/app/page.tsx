"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { StudyCard } from "@/components/StudyCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { createStudy, getMyStudies, type Study } from "@/lib/services/studies";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [studyName, setStudyName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // Ensure user is authenticated and load studies
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      try {
        // Ensure anonymous auth
        const authUser = await ensureAnonymousAuth();
        setUser({ uid: authUser.uid });

        // Load user's studies
        const userStudies = await getMyStudies(authUser.uid);
        setStudies(userStudies);
      } catch (err) {
        console.error("Failed to initialize:", err);
        // If it's a Firestore index error, the user will see it in console
        // and can follow the link to create the index
      } finally {
        setLoading(false);
      }

      // Listen for auth state changes
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
          setUser({ uid: authUser.uid });
          try {
            const userStudies = await getMyStudies(authUser.uid);
            setStudies(userStudies);
          } catch (err) {
            console.error("Failed to load studies:", err);
          }
        } else {
          setUser(null);
          setStudies([]);
        }
      });
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function handleCreateStudy(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);
    const trimmed = studyName.trim();
    if (!trimmed) {
      setCreateError("Please enter a study name.");
      return;
    }
    setCreating(true);
    try {
      const { studyId } = await createStudy(trimmed);
      // Reload studies to include the new one
      if (user) {
        const updatedStudies = await getMyStudies(user.uid);
        setStudies(updatedStudies);
      }
      setStudyName("");
      setShowCreateForm(false);
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* My Studies Section */}
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
              My Studies
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : studies.length === 0 ? (
              <Card>
                <p className="text-center text-slate-600 dark:text-slate-400">
                  You haven&apos;t created any studies yet. Create your first study below!
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {studies.map((study) => (
                  <StudyCard key={study.id} study={study} />
                ))}
              </div>
            )}
          </div>

          {/* Create Study Section */}
          <div className="mb-8">
            {!showCreateForm ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto"
              >
                + Create New Study
              </Button>
            ) : (
              <Card>
                <CardTitle className="mb-4">Create a study</CardTitle>
                <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                  You&apos;ll get a shareable link so others can join. No account needed.
                </p>
                <form onSubmit={handleCreateStudy} className="space-y-4">
                  <Input
                    label="Study name"
                    placeholder="e.g. Romans small group"
                    value={studyName}
                    onChange={(e) => setStudyName(e.target.value)}
                    disabled={creating}
                    autoFocus
                  />
                  {createError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {createError}
                    </p>
                  )}
                  {createSuccess && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Study created successfully!
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={creating}
                      className="flex-1"
                    >
                      {creating ? "Creating…" : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setStudyName("");
                        setCreateError(null);
                      }}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>

          {/* Join Study Section */}
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-sm text-slate-500 dark:text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
            <Card>
              <CardTitle className="mb-4">Join a study</CardTitle>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Have a join code? Enter it below to join an existing study.
              </p>
              <form onSubmit={handleJoin}>
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
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {joinError}
                  </p>
                )}
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LanternLoader } from "@/components/LanternLoader";
import { IngredientSearch } from "@/components/IngredientSearch";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Thyme" },
      {
        name: "description",
        content: "Sign in to Thyme and tell us your restrictions, tastes, and budget.",
      },
      { property: "og:title", content: "Account — Thyme" },
      {
        property: "og:description",
        content: "Sign in to Thyme and tell us your restrictions, tastes, and budget.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

const RESTRICTIONS = [
  "vegetarian",
  "vegan",
  "gluten free",
  "dairy free",
  "halal",
  "peanut",
  "tree nut",
  "egg",
  "shellfish",
  "soy",
  "fish",
];

interface ProfileForm {
  restrictions: string[];
  also_avoid: string;
  likes: string;
  dislikes: string;
  cuisines: string;
  budget: string;
}

const EMPTY_FORM: ProfileForm = {
  restrictions: [],
  also_avoid: "",
  likes: "",
  dislikes: "",
  cuisines: "",
  budget: "",
};

function AccountPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!cancelled) setUser(data.session?.user ?? null);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSessionError("Couldn't verify your session. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void checkSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        if (session) setSessionError(null);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <LanternLoader label="Opening the gate…" />
      </div>
    );
  }

  if (sessionError && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p role="alert" className="text-sm text-destructive">
          {sessionError}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold"
          style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
        >
          Try again
        </button>
      </div>
    );
  }

  return user ? (
    <ProfilePanel user={user} onSignedOut={() => navigate({ to: "/account" })} />
  ) : (
    <AuthPanel />
  );
}

/* ---------------- Sign in / Sign up ---------------- */

function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session === null) {
          setNotice("Check your email for a confirmation link, then sign in here.");
        } else {
          setNotice(null);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(message.includes("Invalid login") ? "Wrong email or password." : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div
        className="rounded-2xl p-6 shadow-lg"
        style={{ background: "var(--card)", color: "var(--card-foreground)" }}
      >
        <h1 className="font-display text-3xl font-bold">
          {mode === "signin" ? "Welcome back" : "Join the grove"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {mode === "signin"
            ? "Sign in to your pantry."
            : "Create an account with email and password."}
        </p>

        <div className="mt-5 flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => setMode("signin")}
            className="rounded-full px-4 py-1.5 text-sm font-medium"
            style={
              mode === "signin"
                ? { background: "var(--gold)", color: "var(--forest-dark)" }
                : { background: "var(--parchment-dark)", color: "var(--ink)" }
            }
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => setMode("signup")}
            className="rounded-full px-4 py-1.5 text-sm font-medium"
            style={
              mode === "signup"
                ? { background: "var(--gold)", color: "var(--forest-dark)" }
                : { background: "var(--parchment-dark)", color: "var(--ink)" }
            }
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-base text-ink outline-none focus:ring-2"
              style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-base text-ink outline-none focus:ring-2"
              style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl px-5 py-3 text-sm font-semibold shadow-md disabled:opacity-60"
            style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
          >
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {notice && (
          <p
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--gold-soft)" }}
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Profile ---------------- */

function ProfilePanel({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "saved" | "load-error" | "save-error"
  >("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("restrictions, also_avoid, likes, dislikes, cuisines, budget")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setForm({
          restrictions: data?.restrictions ?? [],
          also_avoid: data?.also_avoid ?? "",
          likes: data?.likes ?? "",
          dislikes: data?.dislikes ?? "",
          cuisines: data?.cuisines ?? "",
          budget: data?.budget != null ? String(data.budget) : "",
        });
        setStatus("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus("load-error");
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user.id, loadAttempt]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const budgetNum = parseFloat(form.budget);
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        restrictions: form.restrictions,
        also_avoid: form.also_avoid || null,
        likes: form.likes || null,
        dislikes: form.dislikes || null,
        cuisines: form.cuisines || null,
        budget: Number.isFinite(budgetNum) ? budgetNum : null,
      });
      if (error) throw error;
      setStatus("saved");
    } catch (error) {
      console.error(error);
      setStatus("save-error");
    }
  }

  async function signOut() {
    setSignOutError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onSignedOut();
    } catch (error) {
      console.error(error);
      setSignOutError("Couldn't sign out. Please try again.");
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <LanternLoader label="Reading your profile…" />
      </div>
    );
  }

  function toggleRestriction(r: string) {
    setForm((f) => ({
      ...f,
      restrictions: f.restrictions.includes(r)
        ? f.restrictions.filter((x) => x !== r)
        : [...f.restrictions, r],
    }));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-bold" style={{ color: "var(--gold)" }}>
          Your Profile
        </h1>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: "var(--input)", color: "var(--parchment)" }}
        >
          Sign out
        </button>
      </div>
      {signOutError && (
        <p role="alert" className="mt-3 text-right text-sm text-destructive">
          {signOutError}
        </p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <form
        onSubmit={save}
        className="mt-6 space-y-6 rounded-2xl p-6 shadow-lg"
        style={{ background: "var(--card)", color: "var(--card-foreground)" }}
      >
        <fieldset>
          <legend className="text-sm font-semibold">Restrictions</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RESTRICTIONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  checked={form.restrictions.includes(r)}
                  onChange={() => toggleRestriction(r)}
                  className="h-4 w-4 accent-[var(--moss)]"
                />
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        {status === "load-error" && (
          <div role="alert" className="rounded-lg p-3 text-sm text-destructive">
            <p>
              Your saved profile couldn't be loaded. Your settings are unchanged; retry before
              saving.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setLoadAttempt((attempt) => attempt + 1);
              }}
              className="mt-2 underline"
            >
              Retry loading profile
            </button>
          </div>
        )}

        <ProfileIngredientField
          id="also_avoid"
          label="Also avoid"
          hint="Choose ingredients from the catalog."
          value={form.also_avoid}
          onChange={(value) => setForm((f) => ({ ...f, also_avoid: value }))}
        />
        <ProfileIngredientField
          id="likes"
          label="Likes"
          hint="Choose ingredients from the catalog."
          value={form.likes}
          onChange={(value) => setForm((f) => ({ ...f, likes: value }))}
        />
        <ProfileIngredientField
          id="dislikes"
          label="Dislikes"
          hint="Recipes containing these ingredients are hidden."
          value={form.dislikes}
          onChange={(value) => setForm((f) => ({ ...f, dislikes: value }))}
        />
        <TextField
          id="cuisines"
          label="Favorite cuisines"
          hint="e.g. italian, chinese, middle eastern"
          value={form.cuisines}
          onChange={(v) => setForm((f) => ({ ...f, cuisines: v }))}
        />
        <div>
          <label htmlFor="budget" className="text-sm font-medium">
            Budget (USD per meal)
          </label>
          <input
            id="budget"
            type="number"
            min={0}
            step="0.25"
            value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            className="mt-1 w-40 rounded-lg border px-3 py-2 text-base text-ink outline-none focus:ring-2"
            style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "saving" || status === "load-error"}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md disabled:opacity-60"
            style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
          >
            {status === "saving" ? "Saving…" : "Save profile"}
          </button>
          {status === "saved" && (
            <span className="text-sm" style={{ color: "var(--moss)" }}>
              Saved ✓
            </span>
          )}
          {status === "save-error" && (
            <span className="text-sm" style={{ color: "var(--destructive)" }}>
              Couldn't save — try again.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-base text-ink outline-none focus:ring-2"
        style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
      />
    </div>
  );
}

function ProfileIngredientField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value
    .split(/[,;\n]/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);

  function updateSelected(next: string[]) {
    onChange(next.join(", "));
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <p className="text-xs text-ink/50">{hint}</p>
      <div className="mt-2">
        <IngredientSearch
          selected={selected}
          onAdd={(ingredient) =>
            updateSelected(selected.includes(ingredient) ? selected : [...selected, ingredient])
          }
          onRemove={(ingredient) =>
            updateSelected(
              selected.filter((selectedIngredient) => selectedIngredient !== ingredient),
            )
          }
          allowCustom={false}
          placeholder="Search ingredients"
          ariaLabel={label}
          inputId={id}
        />
      </div>
    </div>
  );
}

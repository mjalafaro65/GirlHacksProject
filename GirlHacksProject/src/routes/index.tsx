import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thyme — Cook what you have." },
      {
        name: "description",
        content:
          "Tell Thyme what's in your kitchen and it conjures recipes you can cook tonight — plus a short shopping list when you're just a few things away.",
      },
      { property: "og:title", content: "Thyme — Cook what you have." },
      {
        property: "og:description",
        content: "Enter your pantry, conjure recipes, and gather only what's missing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="text-5xl" aria-hidden>
        🌿
      </span>
      <h1
        className="fade-up mt-4 font-display text-6xl font-bold sm:text-7xl"
        style={{ color: "var(--gold)" }}
      >
        Thyme
      </h1>
      <p className="fade-up mt-2 font-display text-xl italic text-foreground/90">
        Cook what you have.
      </p>
      <p className="fade-up mt-6 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Tell the grove what's already in your kitchen, and it will conjure the
        recipes you can cook tonight — plus a short shopping list for the ones
        that are just a few things away.
      </p>
      <div className="fade-up mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/search"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold shadow-md transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
        >
          Enter Your Pantry Grove
        </Link>
        <Link
          to="/account"
          className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
          style={{ borderColor: "var(--input)", color: "var(--parchment)" }}
        >
          Sign in
        </Link>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        A hackathon sprout by students, for students.
      </p>
    </div>
  );
}

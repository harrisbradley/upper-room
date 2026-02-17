import { Logo } from "@/components/ui/Logo";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
      </div>
    </header>
  );
}

import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-baseline gap-6">
            <Link href="/dashboard" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight">
                CareerOS
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                career operating system
              </span>
            </Link>
            {userEmail ? (
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  href="/roadmap"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Roadmap
                </Link>
                <Link
                  href="/history"
                  className="text-muted-foreground hover:text-foreground"
                >
                  History
                </Link>
                <Link
                  href="/reflect"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Reflect
                </Link>
              </nav>
            ) : null}
          </div>
          {userEmail ? (
            <div className="flex items-center gap-3">
              <span className="hidden max-w-[200px] truncate text-sm text-muted-foreground sm:inline">
                {userEmail}
              </span>
              <SignOutButton />
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

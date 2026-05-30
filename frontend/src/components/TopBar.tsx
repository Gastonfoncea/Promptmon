"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletStatus } from "./WalletStatus";

const NAV = [
  { href: "/create", label: "Crear" },
  { href: "/arena", label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

/** Header compartido: wordmark + navegación con estado activo + wallet. */
export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between border-b border-white/5 px-6 py-3">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-white"
        >
          Prompt<span className="text-[#836EF9]">Mon</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <WalletStatus />
    </header>
  );
}

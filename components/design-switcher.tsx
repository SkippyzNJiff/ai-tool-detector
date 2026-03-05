"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const designLinks = [
  { href: "/1", label: "Design 1" },
  { href: "/2", label: "Design 2" },
  { href: "/3", label: "Design 3" },
  { href: "/4", label: "Design 4" },
  { href: "/5", label: "Design 5" }
];

type DesignSwitcherProps = {
  dark?: boolean;
  className?: string;
};

export function DesignSwitcher({ dark = false, className }: DesignSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      {designLinks.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition",
              dark
                ? active
                  ? "border-white bg-white text-black"
                  : "border-white/35 text-white hover:border-white hover:bg-white/10"
                : active
                  ? "border-black bg-black text-white"
                  : "border-black/20 text-black/75 hover:border-black hover:text-black"
            ].join(" ")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

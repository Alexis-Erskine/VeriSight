"use client";

import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/results", label: "History" },
  { href: "/about", label: "About" },
  {
    href: "https://github.com/Alexis-Erskine/VeriSight",
    label: "GitHub",
    external: true,
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 border-b border-verisight-500/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-verisight-500 to-purple-500 text-xs font-bold text-white">
            V
          </span>
          <span className="text-gradient">VeriSight</span>
        </a>

        <button
          onClick={() => setOpen(!open)}
          className="relative z-50 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-white sm:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>

        <div className="hidden items-center gap-6 text-sm font-medium text-gray-400 sm:flex">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-verisight-400"
              >
                {link.label}
              </a>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-verisight-400"
              >
                {link.label}
              </a>
            )
          )}
        </div>
      </nav>

      {open && (
        <div className="border-t border-verisight-500/10 px-4 pb-4 pt-2 sm:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-verisight-500/10 hover:text-white"
                >
                  {link.label}
                </a>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-verisight-500/10 hover:text-white"
                >
                  {link.label}
                </a>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}

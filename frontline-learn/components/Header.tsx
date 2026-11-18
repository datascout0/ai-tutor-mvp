import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Header({ active }: { active: "app" | "questions" | "about" }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="hidden whitespace-nowrap font-semibold sm:inline">Frontline Learn</span>
          <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 sm:inline">concept</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={`whitespace-nowrap rounded-md px-2 py-1.5 sm:px-3 ${active === "app" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Prototype
          </Link>
          <Link
            href="/questions"
            className={`whitespace-nowrap rounded-md px-2 py-1.5 sm:px-3 ${active === "questions" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <span className="sm:hidden">Questions</span>
            <span className="hidden sm:inline">Questions → courses</span>
          </Link>
          <Link
            href="/about"
            className={`whitespace-nowrap rounded-md px-2 py-1.5 sm:px-3 ${active === "about" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Why &amp; how
          </Link>
          <a
            href="https://www.shubhamdahat.in/"
            target="_blank"
            rel="noreferrer"
            className="ml-2 hidden text-xs text-slate-500 hover:text-slate-800 sm:inline"
          >
            by Shubham Dahat
          </a>
        </nav>
      </div>
    </header>
  );
}

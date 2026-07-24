"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Layers,
  ClipboardList,
  Tags,
  SlidersHorizontal,
  ListChecks,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import type { AppRole } from "@/lib/auth/roles";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavSection = { title: string; items: NavItem[] };

const ROLE_LABELS: Record<AppRole, string> = {
  outlet_user: "Outlet",
  outlet_manager: "Area manager",
  finance_exec: "Finance",
  finance_manager: "Finance manager",
  admin: "Admin",
};

function navForRole(role: AppRole | null): NavSection[] {
  const sections: NavSection[] = [];
  const isFinance = role === "finance_exec" || role === "finance_manager" || role === "admin";
  const isOutlet = role === "outlet_user" || role === "outlet_manager";

  if (isFinance) {
    sections.push({
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/finance/dashboard", icon: LayoutDashboard },
        { label: "Upload", href: "/finance/upload", icon: Upload },
        { label: "Batches", href: "/finance/batches", icon: Layers },
        { label: "Cases", href: "/finance/cases", icon: ClipboardList },
      ],
    });
  }
  if (role === "admin") {
    sections.push({
      title: "Administration",
      items: [
        { label: "Reason codes", href: "/admin/reason-codes", icon: Tags },
        { label: "Classification rules", href: "/admin/classification-rules", icon: SlidersHorizontal },
      ],
    });
  }
  if (isOutlet) {
    sections.push({
      title: "My work",
      items: [{ label: "My cases", href: "/outlet", icon: ListChecks }],
    });
  }
  return sections;
}

function homeFor(role: AppRole | null): string {
  if (role === "outlet_user" || role === "outlet_manager") return "/outlet";
  if (role === "admin") return "/admin";
  return "/finance";
}

export function Sidebar({
  name,
  email,
  role,
}: {
  name: string;
  email: string | null;
  role: AppRole | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sections = navForRole(role);
  const initial = (name || email || "?").charAt(0).toUpperCase();

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 text-white lg:hidden">
        <Link href={homeFor(role)} className="font-bold">
          Mokky&apos;s <span className="text-brand-orange">Unrecon</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 text-gray-300 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link href={homeFor(role)} className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange text-sm font-bold text-white">
              M
            </span>
            <span>
              <span className="block font-bold text-white">
                Mokky&apos;s <span className="text-brand-orange">Unrecon</span>
              </span>
              <span className="block text-xs text-gray-500">Mokky Food Services</span>
            </span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {sections.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-brand-orange/15 text-brand-orange"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-gray-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </div>
            {role && (
              <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
                {ROLE_LABELS[role]}
              </span>
            )}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

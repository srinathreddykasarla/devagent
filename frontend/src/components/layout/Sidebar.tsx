import { NavLink } from "react-router-dom";
import {
  Activity,
  LayoutGrid,
  ListChecks,
  Plug,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { usePlugins } from "@/hooks/useApi";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "AGENTS",
    items: [
      { to: "/", label: "dashboard", icon: LayoutGrid },
      { to: "/pipelines", label: "pipelines", icon: Workflow },
      { to: "/tasks", label: "tasks", icon: ListChecks },
    ],
  },
  {
    label: "OBSERVE",
    items: [
      { to: "/runs", label: "runs", icon: Activity },
      { to: "/plugins", label: "plugins", icon: Plug },
    ],
  },
];

export function Sidebar() {
  const plugins = usePlugins();

  return (
    <aside className="h-screen sticky top-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))] flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-[4px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-fg))] font-semibold text-[11px]">
            {">_"}
          </span>
          <h1 className="text-[12.5px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--fg-strong))]">
            devagent
          </h1>
        </div>
        <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.16em] text-[hsl(var(--subtle))]">
          agent control · v0.1
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-5 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--subtle))]">
              {section.label}
            </div>
            <ul className="space-y-px">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 text-[12px] rounded-[var(--radius-sm)] transition-colors",
                        isActive
                          ? "bg-[hsl(var(--surface-hover))] text-[hsl(var(--fg-strong))] font-medium"
                          : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-hover))] hover:text-[hsl(var(--fg))]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[hsl(var(--accent))] rounded-r-full" />
                        )}
                        <item.icon size={14} strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Plugin status footer */}
      <div className="px-3 py-3 border-t border-[hsl(var(--border))]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--subtle))]">
            integrations
          </span>
          <NavLink
            to="/plugins"
            className="text-[10px] text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))] transition-colors"
          >
            all →
          </NavLink>
        </div>
        <ul className="space-y-1">
          {plugins.isLoading && (
            <li className="text-[11px] text-[hsl(var(--subtle))]">loading...</li>
          )}
          {plugins.data?.map((p) => (
            <li
              key={p.name}
              className="flex items-center gap-2 px-1 text-[11px] text-[hsl(var(--muted))]"
            >
              <StatusDot tone={p.healthy ? "success" : "danger"} size="sm" />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-[10px] text-[hsl(var(--subtle))]">
                {p.healthy ? "ok" : "down"}
              </span>
            </li>
          ))}
          {plugins.data && plugins.data.length === 0 && (
            <li className="text-[11px] text-[hsl(var(--subtle))]">none configured</li>
          )}
        </ul>
      </div>
    </aside>
  );
}

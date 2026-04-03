import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "~" },
  { to: "/tasks", label: "Tasks", icon: "#" },
  { to: "/pipelines", label: "Pipelines", icon: ">" },
  { to: "/plugins", label: "Plugins", icon: "+" },
  { to: "/runs", label: "Runs", icon: "=" },
];

export function Sidebar() {
  return (
    <aside className="w-60 border-r border-border bg-card h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold">DevAgent</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`
            }
          >
            <span className="w-4 text-center font-mono">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

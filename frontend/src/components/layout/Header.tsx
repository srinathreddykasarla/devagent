import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/pipelines": "Pipelines",
  "/plugins": "Plugins",
  "/runs": "Runs",
};

export function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "DevAgent";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6">
      <h2 className="text-lg font-medium">{title}</h2>
    </header>
  );
}

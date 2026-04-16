import { Plug, RotateCw } from "lucide-react";
import { usePlugins } from "@/hooks/useApi";
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  StatusDot,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";

export default function Plugins() {
  const { data: plugins, isLoading, isError, error, refetch, isRefetching } =
    usePlugins();

  return (
    <div className="space-y-5 anim-fade-in-up">
      <PageHeader
        title="plugins"
        subtitle="integration health · updated on refresh"
        action={
          <Button
            variant="secondary"
            iconLeft={<RotateCw size={12} className={isRefetching ? "anim-spin" : ""} />}
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "checking..." : "refresh"}
          </Button>
        }
      />

      <Panel
        title="integrations"
        subtitle={plugins ? `${plugins.length} registered` : undefined}
        bleed
      >
        {isLoading ? (
          <div className="p-6 text-[12px] text-[hsl(var(--muted))]">loading...</div>
        ) : isError ? (
          <div className="p-6 text-[12px] text-[hsl(var(--danger))]">
            failed to load: {(error as Error).message}
          </div>
        ) : !plugins || plugins.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No plugins registered"
            description="Enable plugins in your .env file (JIRA_ENABLED, GITHUB_ENABLED, etc.) and restart the backend."
          />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th className="w-[120px]">status</Th>
                <Th className="w-[160px]">plugin</Th>
                <Th>message</Th>
                <Th>capabilities</Th>
              </Tr>
            </THead>
            <TBody>
              {plugins.map((p) => (
                <Tr key={p.name}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusDot tone={p.healthy ? "success" : "danger"} />
                      <span
                        className={`text-[10.5px] uppercase tracking-[0.1em] font-medium ${
                          p.healthy
                            ? "text-[hsl(var(--success))]"
                            : "text-[hsl(var(--danger))]"
                        }`}
                      >
                        {p.healthy ? "healthy" : "down"}
                      </span>
                    </div>
                  </Td>
                  <Td className="font-medium text-[hsl(var(--fg-strong))]">
                    {p.name}
                  </Td>
                  <Td className="text-[hsl(var(--muted))]">{p.message}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {p.capabilities.map((cap) => (
                        <Badge key={cap} variant="default" className="font-[var(--font-mono)]">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--fg-strong))]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[11.5px] text-[hsl(var(--muted))]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

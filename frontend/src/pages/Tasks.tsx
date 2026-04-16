import { useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import {
  useCreateTask,
  useDeleteTask,
  usePipelines,
  useTasks,
} from "@/hooks/useApi";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Modal,
  Panel,
  Select,
  StatusDot,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";

type TriggerType = "manual" | "cron" | "webhook" | "event";

interface TaskFormData {
  name: string;
  pipeline: string;
  trigger_type: TriggerType;
  enabled: boolean;
}

const EMPTY: TaskFormData = {
  name: "",
  pipeline: "",
  trigger_type: "manual",
  enabled: true,
};

export default function Tasks() {
  const { data: tasks, isLoading, isError, error } = useTasks();
  const { data: pipelines } = usePipelines();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(EMPTY);

  function handleCreate() {
    createTask.mutate(
      {
        name: formData.name,
        pipeline: formData.pipeline,
        trigger_type: formData.trigger_type,
        enabled: formData.enabled,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setFormData(EMPTY);
        },
      },
    );
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete task "${name}"?`)) deleteTask.mutate(id);
  }

  return (
    <div className="space-y-5 anim-fade-in-up">
      <PageHeader
        title="tasks"
        subtitle="scheduled and manual pipeline triggers"
        action={
          <Button
            variant="primary"
            iconLeft={<Plus size={13} />}
            onClick={() => setShowModal(true)}
          >
            new task
          </Button>
        }
      />

      <Panel
        title="task definitions"
        subtitle={tasks ? `${tasks.length} total` : undefined}
        bleed
      >
        {isLoading ? (
          <div className="p-6 text-[12px] text-[hsl(var(--muted))]">loading...</div>
        ) : isError ? (
          <div className="p-6 text-[12px] text-[hsl(var(--danger))]">
            failed to load: {(error as Error).message}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No tasks defined"
            description="Tasks let you schedule pipelines via cron, trigger on webhook, or run manually on demand."
            action={
              <Button
                variant="primary"
                iconLeft={<Plus size={13} />}
                onClick={() => setShowModal(true)}
              >
                create task
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>name</Th>
                <Th>pipeline</Th>
                <Th className="w-[110px]">trigger</Th>
                <Th className="w-[100px]">enabled</Th>
                <Th className="w-[60px]" />
              </Tr>
            </THead>
            <TBody>
              {tasks.map((task) => (
                <Tr key={task.id}>
                  <Td className="font-medium">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="hover:text-[hsl(var(--accent))] transition-colors"
                    >
                      {task.name}
                    </Link>
                  </Td>
                  <Td className="font-[var(--font-mono)] text-[hsl(var(--muted))]">
                    {task.pipeline}
                  </Td>
                  <Td>
                    <Badge variant="default" upper>
                      {task.trigger_type}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <StatusDot tone={task.enabled ? "success" : "muted"} />
                      <span className="text-[11px] text-[hsl(var(--muted))]">
                        {task.enabled ? "yes" : "no"}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <button
                      onClick={() => handleDelete(task.id, task.name)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[hsl(var(--subtle))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)] transition-colors"
                      aria-label={`Delete ${task.name}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData(EMPTY);
        }}
        title="New task"
        subtitle="schedule or manually trigger a pipeline"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              cancel
            </Button>
            <Button
              variant="primary"
              loading={createTask.isPending}
              disabled={!formData.name.trim() || !formData.pipeline.trim()}
              onClick={handleCreate}
            >
              create task
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <Label htmlFor="task-name">name</Label>
            <Input
              id="task-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. nightly jira summary"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="task-pipeline">pipeline</Label>
            <Select
              id="task-pipeline"
              value={formData.pipeline}
              onChange={(e) => setFormData({ ...formData, pipeline: e.target.value })}
              className="mt-1.5"
            >
              <option value="">select a pipeline...</option>
              {pipelines?.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-trigger">trigger type</Label>
            <Select
              id="task-trigger"
              value={formData.trigger_type}
              onChange={(e) =>
                setFormData({ ...formData, trigger_type: e.target.value as TriggerType })
              }
              className="mt-1.5"
            >
              <option value="manual">manual — run on demand</option>
              <option value="cron">cron — scheduled</option>
              <option value="webhook">webhook — incoming trigger</option>
              <option value="event">event — event-driven</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 pt-1 text-[12px] text-[hsl(var(--fg))] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="accent-[hsl(var(--accent))]"
            />
            enabled
          </label>
          {createTask.isError && (
            <div className="px-3 py-2 bg-[hsl(var(--danger-soft))] border border-[hsl(var(--danger)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--danger))]">
              {(createTask.error as Error).message}
            </div>
          )}
        </div>
      </Modal>
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

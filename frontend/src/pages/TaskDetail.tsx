import { useParams } from "react-router-dom";

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return (
    <div>
      <p className="text-muted-foreground">Task: {taskId}</p>
    </div>
  );
}

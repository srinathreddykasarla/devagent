import { useParams } from "react-router-dom";

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  return (
    <div>
      <p className="text-muted-foreground">Run: {runId}</p>
    </div>
  );
}

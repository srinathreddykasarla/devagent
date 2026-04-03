import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import Pipelines from "@/pages/Pipelines";
import Plugins from "@/pages/Plugins";
import Runs from "@/pages/Runs";
import RunDetail from "@/pages/RunDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/pipelines" element={<Pipelines />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

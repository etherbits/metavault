import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

type HealthStatus = "pending" | "ok" | "error";

function useApiHealth() {
  const [status, setStatus] = useState<HealthStatus>("pending");
  const [uptime, setUptime] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setStatus("ok");
        setUptime(data.uptime);
      })
      .catch(() => setStatus("error"));
  }, []);

  return { status, uptime };
}

export function App() {
  const { status, uptime } = useApiHealth();

  return (
    <div className="container mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] scale-120"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] [animation:spin_20s_linear_infinite]"
        />
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-muted">
        <CardContent className="pt-6">
          <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
          <h2>asd</h2>
          <p>
            Edit{" "}
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              src/App.tsx
            </code>{" "}
            and save to test HMR
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status === "pending"
                ? "bg-yellow-400"
                : status === "ok"
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
          />
          <span>
            API:{" "}
            {status === "pending"
              ? "checking…"
              : status === "ok"
                ? `ok · uptime ${Math.floor(uptime ?? 0)}s`
                : "unreachable"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;

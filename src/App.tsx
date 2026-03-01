import { useMemo, useState } from "react";
import "./App.css";

type Route = "home" | "social" | "x";

export default function App() {
  const [route, setRoute] = useState<Route>("home");

  const header = useMemo(() => {
    const title =
      route === "home" ? "Nova" : route === "social" ? "Social Media" : "X Agent";
    const subtitle =
      route === "home"
        ? "One-click AI employee system"
        : route === "social"
          ? "Choose a platform"
          : "Create an AI employee for X";

    return { title, subtitle };
  }, [route]);

  return (
    <div className="nova-root">
      <div className="nova-shell">
        <header className="nova-header">
          <div>
            <div className="nova-title">{header.title}</div>
            <div className="nova-subtitle">{header.subtitle}</div>
          </div>

          <div className="nova-actions">
            {route !== "home" && (
              <button className="btn" onClick={() => setRoute("home")}>
                Back
              </button>
            )}
          </div>
        </header>

        <main className="nova-main">
          {route === "home" && (
            <div className="grid">
              <button className="card" onClick={() => setRoute("social")}>
                <div className="card-title">Social Media</div>
                <div className="card-desc">X / TikTok / YouTube (WIP)</div>
              </button>

              <div className="card card-disabled">
                <div className="card-title">Finance</div>
                <div className="card-desc">Coming soon</div>
              </div>
            </div>
          )}

          {route === "social" && (
            <div className="grid">
              <button className="card" onClick={() => setRoute("x")}>
                <div className="card-title">X</div>
                <div className="card-desc">Auto post • Auto reply (later)</div>
              </button>

              <div className="card card-disabled">
                <div className="card-title">TikTok</div>
                <div className="card-desc">Coming soon</div>
              </div>

              <div className="card card-disabled">
                <div className="card-title">YouTube</div>
                <div className="card-desc">Coming soon</div>
              </div>
            </div>
          )}

          {route === "x" && <XAgentSetup />}
        </main>
      </div>
    </div>
  );
}

function XAgentSetup() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "ready">("idle");

  return (
    <div className="panel">
      <div className="panel-title">Connect your AI</div>
      <div className="panel-desc">
        For MVP, we only need an LLM API key. X posting will be added next.
      </div>

      <label className="field">
        <div className="label">LLM API Key</div>
        <input
          className="input"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="paste your key here"
        />
      </label>

      <div className="row">
        <button
          className="btn primary"
          onClick={() => setStatus(apiKey.trim() ? "ready" : "idle")}
        >
          Validate
        </button>

        <button className="btn" disabled={status !== "ready"}>
          Start Agent (WIP)
        </button>
      </div>

      <div className="hint">
        Status:{" "}
        <b>{status === "ready" ? "Ready ✅ (UI only for now)" : "Not ready"}</b>
      </div>
    </div>
  );
}
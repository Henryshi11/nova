import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { load } from "@tauri-apps/plugin-store";

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
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [msg, setMsg] = useState("");

  // ✅ store 用 load() 创建（避免 new Store 报 private）
  useEffect(() => {
    (async () => {
      const store = await load("nova.store.json");

      const saved = (await store.get("llm_api_key")) as string | null;
      if (saved) {
        setApiKey(saved);
        setStatus("saved");
        setMsg("Loaded saved key ✅");
      }
    })();
  }, []);

  async function validateAndSave() {
    if (!apiKey.trim()) {
      setStatus("idle");
      setMsg("Please input an API key.");
      return;
    }

    setStatus("saving");
    setMsg("Saving...");

    const store = await load("nova.store.json");
    await store.set("llm_api_key", apiKey.trim());
    await store.save();

    setStatus("saved");
    setMsg("Saved locally ✅");
  }

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
        <button className="btn primary" onClick={validateAndSave}>
          {status === "saving" ? "Saving..." : "Validate"}
        </button>

        <button className="btn" disabled={status !== "saved"}>
          Start Agent (WIP)
        </button>
      </div>

      <div className="hint">
        Status:{" "}
        <b>
          {status === "saved"
            ? "Ready ✅ (stored locally)"
            : status === "saving"
              ? "Saving..."
              : "Not ready"}
        </b>
        <div style={{ marginTop: 6 }}>{msg}</div>
      </div>
    </div>
  );
}
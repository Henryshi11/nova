import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { load } from "@tauri-apps/plugin-store";

type Route = "home" | "social" | "x";
type Provider = "openai" | "openrouter";

const DEFAULTS: Record<Provider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.2",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    // ✅ 默认给一个免费可跑的
    model: "mistralai/mistral-7b-instruct:free",
  },
};

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
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [baseUrl, setBaseUrl] = useState(DEFAULTS.openrouter.baseUrl);
  const [model, setModel] = useState(DEFAULTS.openrouter.model);

  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [msg, setMsg] = useState("");

  const [testPrompt, setTestPrompt] = useState("say hello");
  const [runStatus, setRunStatus] = useState<"idle" | "running">("idle");
  const [output, setOutput] = useState("");

  // Timeout wrapper so UI never stays stuck
  const withTimeout = <T,>(p: Promise<T>, ms = 12000) =>
    Promise.race([
      p,
      new Promise<T>((_, rej) =>
        setTimeout(() => rej(new Error("Timeout: operation took too long")), ms),
      ),
    ]);

  function normalizeBaseUrl(url: string) {
    return url.trim().replace(/\/+$/, "");
  }

  function authHeaders(p: Provider, key: string) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
    };

    // OpenRouter optional headers (nice-to-have)
    if (p === "openrouter") {
      // headers["HTTP-Referer"] = "https://your-app.example";
      // headers["X-Title"] = "Nova";
    }

    return headers;
  }

  // ✅ Load saved settings
  useEffect(() => {
    (async () => {
      try {
        const store = await load("nova.store.json");

        const savedProvider = (await store.get("llm_provider")) as Provider | null;
        const savedBaseUrl = (await store.get("llm_base_url")) as string | null;
        const savedModel = (await store.get("llm_model")) as string | null;
        const savedKey = (await store.get("llm_api_key")) as string | null;

        const p = savedProvider ?? "openrouter";
        setProvider(p);
        setBaseUrl(savedBaseUrl ?? DEFAULTS[p].baseUrl);
        setModel(savedModel ?? DEFAULTS[p].model);

        if (savedKey) {
          setApiKey(savedKey);
          setStatus("saved");
          setMsg("Loaded saved settings ✅");
        }
      } catch (e: any) {
        setStatus("idle");
        setMsg(`Load failed: ${e?.message ?? String(e)}`);
      }
    })();
  }, []);

  // If provider changes, auto-fill defaults (only when baseUrl/model still equals old defaults)
  useEffect(() => {
    setBaseUrl((prev) => {
      const n = normalizeBaseUrl(prev);
      const isPrevDefault =
        n === DEFAULTS.openai.baseUrl || n === DEFAULTS.openrouter.baseUrl;
      return isPrevDefault ? DEFAULTS[provider].baseUrl : prev;
    });
    setModel((prev) => {
      const isPrevDefault =
        prev === DEFAULTS.openai.model || prev === DEFAULTS.openrouter.model;
      return isPrevDefault ? DEFAULTS[provider].model : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  async function saveAllLocally() {
    const key = apiKey.trim();
    if (!key) throw new Error("API key is empty.");

    const store = await load("nova.store.json");
    await withTimeout(store.set("llm_provider", provider));
    await withTimeout(store.set("llm_base_url", normalizeBaseUrl(baseUrl)));
    await withTimeout(store.set("llm_model", model.trim()));
    await withTimeout(store.set("llm_api_key", key));
    await withTimeout(store.save());
  }

  async function validateKeyOnly() {
    const key = apiKey.trim();
    if (!key) {
      setStatus("idle");
      setMsg("Please input an API key.");
      return false;
    }

    setStatus("saving");
    setMsg("Validating key...");

    try {
      const url = `${normalizeBaseUrl(baseUrl)}/models`;
      const res = await withTimeout(
        fetch(url, {
          method: "GET",
          headers: {
            ...authHeaders(provider, key),
          },
        }),
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Validate failed (${res.status}): ${text || res.statusText}`);
      }

      setMsg("Key is valid ✅");
      return true;
    } catch (e: any) {
      setStatus("idle");
      setMsg(e?.message ?? String(e));
      return false;
    }
  }

  async function validateThenSave() {
    const ok = await validateKeyOnly();
    if (!ok) return;

    setMsg("Saving locally...");
    try {
      await saveAllLocally();
      setStatus("saved");
      setMsg("Validated + saved ✅");
    } catch (e: any) {
      setStatus("idle");
      setMsg(`Save failed: ${e?.message ?? String(e)}`);
    }
  }

  // ✅ 关键：OpenRouter 更稳的方式是 /chat/completions
  async function runTestPrompt() {
    const key = apiKey.trim();
    if (!key) {
      setMsg("Please input an API key.");
      return;
    }
    if (!model.trim()) {
      setMsg("Please input a model.");
      return;
    }

    setRunStatus("running");
    setOutput("");

    try {
      const url = `${normalizeBaseUrl(baseUrl)}/chat/completions`;

      const res = await withTimeout(
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(provider, key),
          },
          body: JSON.stringify({
            model: model.trim(),
            messages: [{ role: "user", content: testPrompt.trim() || "say hello" }],
            max_tokens: 500,
          }),
        }),
        20000,
      );

      const json = await res.json().catch(async () => {
        const t = await res.text().catch(() => "");
        throw new Error(`Non-JSON response: ${t}`);
      });

      if (!res.ok) {
        throw new Error(`Run failed (${res.status}): ${JSON.stringify(json)}`);
      }

      const text =
        json?.choices?.[0]?.message?.content ??
        JSON.stringify(json, null, 2);

      setOutput(text);

      // 显示真实使用的model（OpenRouter通常会返回）
      setMsg(`Used model: ${json?.model ?? model.trim()} ✅`);
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setRunStatus("idle");
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 720 }}>
      <div className="panel-title">Connect your AI</div>
      <div className="panel-desc">
        Goal: free model that can run. Recommend: <b>mistralai/mistral-7b-instruct:free</b>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <label className="field" style={{ flex: 1, marginTop: 0 }}>
          <div className="label">Provider</div>
          <select
            className="input"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </label>

        <label className="field" style={{ flex: 2, marginTop: 0 }}>
          <div className="label">Base URL</div>
          <input
            className="input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
        </label>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <label className="field" style={{ flex: 2, marginTop: 0 }}>
          <div className="label">Model</div>
          <input
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="mistralai/mistral-7b-instruct:free"
          />
          <div className="tiny-hint">
            Tip: free models usually end with <b>:free</b>
          </div>
        </label>

        <label className="field" style={{ flex: 3, marginTop: 0 }}>
          <div className="label">API Key</div>
          <input
            className="input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-..."
          />
        </label>
      </div>

      <div className="row">
        <button className="btn primary" onClick={validateThenSave}>
          {status === "saving" ? "Working..." : "Validate + Save"}
        </button>

        <button className="btn" onClick={validateKeyOnly} disabled={status === "saving"}>
          Validate Only
        </button>

        <button className="btn" onClick={() => saveAllLocally()} disabled={status === "saving"}>
          Save Only
        </button>
      </div>

      <div className="hint">
        Status:{" "}
        <b>
          {status === "saved"
            ? "Ready ✅ (stored locally)"
            : status === "saving"
              ? "Working..."
              : "Not ready"}
        </b>
        <div style={{ marginTop: 6 }}>{msg}</div>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          margin: "16px 0",
        }}
      />

      <div className="panel-title" style={{ fontSize: 14 }}>
        Test Prompt (MVP loop)
      </div>
      <div className="panel-desc">
        prompt → call API → show output.
      </div>

      <label className="field">
        <div className="label">Prompt</div>
        <textarea
          className="input"
          style={{ minHeight: 90, resize: "vertical" }}
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          placeholder="Type something..."
        />
      </label>

      <div className="row">
        <button
          className="btn primary"
          onClick={runTestPrompt}
          disabled={runStatus === "running"}
        >
          {runStatus === "running" ? "Running..." : "Run Prompt"}
        </button>

        <button
          className="btn"
          onClick={() => setOutput("")}
          disabled={!output || runStatus === "running"}
        >
          Clear Output
        </button>
      </div>

      <label className="field">
        <div className="label">Output</div>
        <textarea
          className="input"
          style={{ minHeight: 140, resize: "vertical" }}
          value={output}
          readOnly
          placeholder="Model output will appear here..."
        />
      </label>
    </div>
  );
}
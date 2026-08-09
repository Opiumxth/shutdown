"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMES, type Theme } from "@/lib/constants";

type Step = "start" | "created" | "theme";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("start");
  const [matchId, setMatchId] = useState("");
  const [joinId, setJoinId] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    setMatchId(randomMatchId());
    setCopied(false);
    setStep("created");
  }

  function handleJoin() {
    const trimmed = joinId.trim().toUpperCase();
    if (!trimmed) return;
    setMatchId(trimmed);
    setStep("theme");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — non-critical, ignore.
    }
  }

  function handleEnter() {
    if (!selectedTheme) return;
    router.push(`/match/${matchId}?theme=${encodeURIComponent(selectedTheme)}`);
  }

  const footerHint =
    step === "start"
      ? "enter  unirse"
      : step === "created"
        ? "click  copiar código"
        : "1-4  elegir tema";

  return (
    <main className="relative flex flex-1 items-center justify-center p-8">
      <div className="landing-backdrop" aria-hidden="true" />

      <div className="terminal-card">
        <div className="terminal-card-header">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
          <span className="terminal-card-path">~/shutdown</span>
        </div>

        <div className="terminal-card-body">
          <pre className="ascii-title">SHUTDOWN</pre>
          <p className="terminal-subtitle">
            duelo de hacking 1v1 en tiempo real
          </p>

          {step === "start" && (
            <>
              <label className="terminal-label" htmlFor="join-code">
                Unirse a partida
              </label>
              <input
                id="join-code"
                className="terminal-input"
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="código, ej: A1B2C3"
                autoFocus
                style={{ marginBottom: 10 }}
              />
              <button
                type="button"
                className="terminal-btn terminal-btn-primary"
                onClick={handleJoin}
                disabled={!joinId.trim()}
              >
                Unirse
              </button>

              <p className="terminal-divider">— o —</p>

              <button
                type="button"
                className="terminal-btn"
                style={{ width: "100%" }}
                onClick={handleCreate}
              >
                Crear partida nueva
              </button>
            </>
          )}

          {step === "created" && (
            <>
              <label className="terminal-label">Pasale este código a tu rival</label>
              <div className="terminal-code-box">{matchId}</div>
              <button
                type="button"
                className="terminal-btn"
                style={{ width: "100%", marginBottom: 10 }}
                onClick={handleCopy}
              >
                {copied ? "Copiado" : "Copiar código"}
              </button>
              <button
                type="button"
                className="terminal-btn terminal-btn-primary"
                onClick={() => setStep("theme")}
              >
                Continuar
              </button>
            </>
          )}

          {step === "theme" && (
            <>
              <label className="terminal-label">Elegí el tema de tu ataque</label>
              <div className="terminal-theme-row">
                {THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    className={`terminal-theme-pill${selectedTheme === theme ? " selected" : ""}`}
                    onClick={() => setSelectedTheme(theme)}
                  >
                    {theme}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="terminal-btn terminal-btn-primary"
                onClick={handleEnter}
                disabled={!selectedTheme}
              >
                Entrar a la partida
              </button>
            </>
          )}
        </div>

        <div className="terminal-card-footer">
          <span>{footerHint}</span>
          <span>{matchId ? `partida ${matchId}` : "shutdown.exe"}</span>
        </div>
      </div>
    </main>
  );
}

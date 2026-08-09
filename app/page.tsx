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

  const statusText =
    step === "start"
      ? "Listo."
      : step === "created"
        ? "Partida creada — compartí el código."
        : "Elegí un tema para empezar.";

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="window" style={{ width: 420 }}>
        <div className="title-bar">
          <div className="title-bar-text">shutdown.exe — Duelo de hacking</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>

        <div className="window-body">
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icons/central-node.png" alt="" width={40} height={40} />
            <div>
              <p style={{ fontSize: 18, fontWeight: "bold", margin: 0 }}>SHUTDOWN</p>
              <p style={{ margin: 0, opacity: 0.75 }}>
                Atacá con minijuegos contrarreloj. Defendete antes de apagarte.
              </p>
            </div>
          </div>

          {step === "start" && (
            <>
              <fieldset>
                <legend>Unirse a partida</legend>
                <div className="field-row-stacked" style={{ width: "100%" }}>
                  <label htmlFor="join-code">Código de partida</label>
                  <input
                    id="join-code"
                    type="text"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    placeholder="Ej: A1B2C3"
                    autoFocus
                  />
                </div>
                <section className="field-row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="button" onClick={handleJoin} disabled={!joinId.trim()}>
                    Unirse
                  </button>
                </section>
              </fieldset>

              <p style={{ textAlign: "center", margin: "12px 0", opacity: 0.6 }}>— o —</p>

              <section className="field-row" style={{ justifyContent: "center" }}>
                <button type="button" onClick={handleCreate}>
                  Crear partida nueva
                </button>
              </section>
            </>
          )}

          {step === "created" && (
            <>
              <fieldset>
                <legend>Partida creada</legend>
                <p>Pasale este código a tu rival para que se una:</p>
                <div className="field-row">
                  <input
                    readOnly
                    value={matchId}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 22,
                      fontWeight: "bold",
                      letterSpacing: 2,
                      textAlign: "center",
                      flex: 1,
                    }}
                  />
                  <button type="button" onClick={handleCopy}>
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </fieldset>
              <section className="field-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" onClick={() => setStep("theme")}>
                  Continuar
                </button>
              </section>
            </>
          )}

          {step === "theme" && (
            <fieldset>
              <legend>Elegí el tema de tu ataque</legend>
              {THEMES.map((theme) => (
                <div className="field-row" key={theme}>
                  <input
                    id={`theme-${theme}`}
                    type="radio"
                    name="theme"
                    checked={selectedTheme === theme}
                    onChange={() => setSelectedTheme(theme)}
                  />
                  <label htmlFor={`theme-${theme}`}>{theme}</label>
                </div>
              ))}
              <section className="field-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" onClick={handleEnter} disabled={!selectedTheme}>
                  Entrar a la partida
                </button>
              </section>
            </fieldset>
          )}
        </div>

        <div className="status-bar">
          <p className="status-bar-field">{statusText}</p>
          {matchId && <p className="status-bar-field">Partida: {matchId}</p>}
        </div>
      </div>
    </main>
  );
}

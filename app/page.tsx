"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMES } from "@/lib/constants";

type Step = "start" | "join" | "theme";

function randomMatchId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("start");
  const [matchId, setMatchId] = useState("");
  const [joinId, setJoinId] = useState("");

  function handleCreate() {
    setMatchId(randomMatchId());
    setStep("theme");
  }

  function handleJoin() {
    const trimmed = joinId.trim().toUpperCase();
    if (!trimmed) return;
    setMatchId(trimmed);
    setStep("theme");
  }

  function handleTheme(theme: string) {
    router.push(`/match/${matchId}?theme=${encodeURIComponent(theme)}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="window" style={{ width: 360 }}>
        <div className="title-bar">
          <div className="title-bar-text">shutdown.exe</div>
        </div>
        <div className="window-body">
          {step === "start" && (
            <>
              <p>Duelo de hacking 1v1 en tiempo real.</p>
              <p>Atacá con minijuegos contrarreloj. Defendete antes de apagarte.</p>
              <section className="field-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" onClick={() => setStep("join")}>
                  Unirse a partida
                </button>
                <button type="button" onClick={handleCreate}>
                  Crear partida
                </button>
              </section>
            </>
          )}

          {step === "join" && (
            <>
              <p>Código de la partida:</p>
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Ej: A1B2C3"
                style={{ width: "100%", marginBottom: 12 }}
                autoFocus
              />
              <section className="field-row" style={{ justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setStep("start")}>
                  Volver
                </button>
                <button type="button" onClick={handleJoin} disabled={!joinId.trim()}>
                  Unirse
                </button>
              </section>
            </>
          )}

          {step === "theme" && (
            <>
              <p>Partida: {matchId}</p>
              <p>Elegí el tema de tu ataque:</p>
              {THEMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => handleTheme(theme)}
                  style={{ display: "block", width: "100%", marginBottom: 6 }}
                >
                  {theme}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Screen = "intro" | "choices" | "confirm" | "success" | "white" | "login";
const INTRO_KEY = "rp_election_intro_completed_2026";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [option, setOption] = useState<1 | 2>(1);
  const [operationId, setOperationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const introVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(INTRO_KEY) === "yes") {
        setScreen("choices");
        return;
      }
    } catch {
      // Continue with the presentation when browser storage is unavailable.
    }
    void introVideo.current?.play().catch(finishIntro);
  }, []);

  function finishIntro() {
    try {
      window.localStorage.setItem(INTRO_KEY, "yes");
    } catch {
      // The current tab still proceeds if browser storage is unavailable.
    }
    setScreen("choices");
  }

  function choose(value: 1 | 2) {
    setOption(value);
    setOperationId(crypto.randomUUID());
    setMessage("");
    setScreen("confirm");
  }

  async function confirmVote() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option, operationId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo registrar el voto.");
      setScreen("success");
      window.setTimeout(() => {
        setScreen("white");
        window.setTimeout(() => {
          setMessage("");
          setOperationId("");
          setScreen("choices");
        }, 10_000);
      }, 1600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de conexión. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      window.location.href = "/admin";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo validar el acceso.");
      setBusy(false);
    }
  }

  if (screen === "white") return <main className="whiteout" aria-label="Pausa de privacidad" />;

  if (screen === "login") {
    return <main className="login-page">
      <section className="login-panel">
        <Image className="login-crest" src="/images/insignia-ricardo-palma.png" alt="Insignia de la Institución Educativa Ricardo Palma" width={110} height={150} />
        <p className="eyebrow">Acceso restringido</p>
        <h1>Administración electoral</h1>
        <form onSubmit={login} className="login-form">
          <label htmlFor="admin-password">Contraseña</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {message && <p className="form-error" role="alert">{message}</p>}
          <button className="button button-primary" disabled={busy}>{busy ? "VALIDANDO..." : "INGRESAR"}</button>
        </form>
        <button className="text-button" onClick={() => { setMessage(""); setScreen("choices"); }}>Volver a votar</button>
      </section>
    </main>;
  }

  if (screen === "choices" || screen === "confirm") {
    return <main className="ballot-page">
      <header className="ballot-header">
        <Image src="/images/insignia-ricardo-palma.png" alt="Insignia Ricardo Palma" width={54} height={68} />
        <div><p className="eyebrow">Marcona · 2026</p><h1>Elige tu lista</h1></div>
        {screen === "choices" && <button className="admin-link ballot-admin-link" onClick={() => { setMessage(""); setScreen("login"); }}>ADMINISTRADOR</button>}
      </header>
      {screen === "choices" ? <>
        <p className="ballot-intro">Tu voz construye nuestra comunidad.</p>
        <section className="choices-grid" aria-label="Opciones electorales">
          {([1, 2] as const).map((value) => <article className="choice" key={value}>
            <div className="choice-number">LISTA 0{value}</div>
            <Image src={`/images/opcion-${value}.png`} alt={`Logo de la opción ${value}`} width={640} height={640} priority />
            <button className="button button-primary" onClick={() => choose(value)}>VOTAR POR ESTA LISTA</button>
          </article>)}
        </section>
      </> : <section className="confirm-panel">
        <p className="eyebrow">Tu selección</p>
        <h2>¿ESTÁS SEGURO DE TU ELECCIÓN?</h2>
        <div className="selected-mark">OPCIÓN 0{option}</div>
        <p>Al confirmar, tu voto quedará registrado de forma permanente.</p>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="confirm-actions">
          <button className="button button-primary" disabled={busy} onClick={confirmVote}>{busy ? "REGISTRANDO..." : "CONFIRMAR VOTO"}</button>
          <button className="button button-outline" disabled={busy} onClick={() => { setOperationId(""); setMessage(""); setScreen("choices"); }}>REGRESAR</button>
        </div>
      </section>}
    </main>;
  }

  if (screen === "success") return <main className="success-page"><div className="success-mark" aria-hidden="true">✓</div><p className="eyebrow">Elecciones escolares 2026</p><h1>¡TU VOTO HA SIDO REGISTRADO CORRECTAMENTE!</h1></main>;

  return <main className="intro-screen"><video ref={introVideo} src="/videos/presentacion.mp4" muted playsInline onEnded={finishIntro} onError={finishIntro} aria-label="Video institucional de bienvenida" /></main>;
}
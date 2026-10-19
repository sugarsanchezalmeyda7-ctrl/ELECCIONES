"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Results = { option1: number; option2: number; total: number; open: boolean; round: number; updatedAt: string };
const COLORS = ["#164b38", "#d3a52c"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export default function AdminDashboard() {
  const [results, setResults] = useState<Results | null>(null);
  const [view, setView] = useState<"count" | "charts">("count");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  async function refresh() {
    try {
      const response = await fetch("/api/admin/results", { cache: "no-store" });
      if (response.status === 401) { window.location.replace("/"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setResults(body);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los resultados.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(interval);
  }, []);

  async function setVoting(open: boolean) {
    setError("");
    const response = await fetch("/api/admin/control", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ open }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "No se pudo actualizar el estado.");
    else await refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function resetResults() {
    if (results?.open || resetting) return;
    const confirmed = window.confirm("¿Reiniciar los conteos a cero para una nueva ronda? La votación anterior se conservará en el historial protegido.");
    if (!confirmed) return;
    setResetting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reset", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudieron reiniciar los resultados.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron reiniciar los resultados.");
    } finally {
      setResetting(false);
    }
  }

  const count1 = results?.option1 ?? 0;
  const count2 = results?.option2 ?? 0;
  const total = results?.total ?? 0;
  const chartData = [{ name: "Opción 1", votos: count1 }, { name: "Opción 2", votos: count2 }];
  const pieData = chartData.map((item) => ({ ...item, value: item.votos }));
  const percent = (value: number) => total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
  const leader = count1 === count2 ? "EMPATE" : count1 > count2 ? "OPCIÓN 1" : "OPCIÓN 2";

  return <main className="admin-page">
    <header className="admin-header">
      <div className="admin-brand"><div className="admin-brand-seal">RP</div><div><p className="eyebrow">Marcona · 2026</p><h1>PANEL ADMINISTRATIVO ELECTORAL<br /><span>I. E. RICARDO PALMA</span></h1></div></div>
      <button className="button button-outline logout-button" onClick={logout}>CERRAR SESIÓN <span aria-hidden="true">↗</span></button>
    </header>
    <section className="admin-content">
      <div className="admin-toolbar">
        <div><p className="eyebrow">Supervisión en vivo · Ronda {results?.round ?? "—"}</p><h2>{view === "count" ? "Conteo de votos" : "Resultados gráficos"}</h2></div>
        <div className="toolbar-actions">
          {view === "count" ? <button className="button button-primary" onClick={() => setView("charts")}>▥ &nbsp; VER GRÁFICOS</button> : <>
            <button className="button button-outline" onClick={() => setView("count")}>VOLVER AL CONTEO</button>
            <button className="button button-outline" onClick={() => void refresh()}>↻ &nbsp; ACTUALIZAR RESULTADOS</button>
            <button className="button button-outline" onClick={() => setView("count")}>VOLVER AL PANEL</button>
          </>}
        </div>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="leader-strip"><span>VA GANANDO</span><strong>{total ? leader : "SIN VOTOS"}</strong><span>RESULTADOS DE LA RONDA ACTUAL · {total} VOTOS</span></div>
      <div className="result-cards">
        <article className="result-card result-card-green"><div className="result-label"><span className="result-symbol">01</span> OPCIÓN 1</div><strong>{loading ? "—" : count1}</strong><div className="result-bottom"><span>Votos registrados</span><span>{percent(count1)}</span></div><div className="progress-track"><span style={{ width: percent(count1) }} /></div></article>
        <article className="result-card result-card-gold"><div className="result-label"><span className="result-symbol">02</span> OPCIÓN 2</div><strong>{loading ? "—" : count2}</strong><div className="result-bottom"><span>Votos registrados</span><span>{percent(count2)}</span></div><div className="progress-track"><span style={{ width: percent(count2) }} /></div></article>
        <article className="result-card result-card-total"><div className="result-label"><span className="result-symbol">Σ</span> TOTAL GENERAL</div><strong>{loading ? "—" : total}</strong><div className="result-bottom"><span>Votos válidos</span><span className="status"><i className={results?.open ? "status-open" : "status-closed"} />{results?.open ? "VOTACIÓN ABIERTA" : "VOTACIÓN CERRADA"}</span></div><p className="updated-at">Actualizado: {results ? formatDate(results.updatedAt) : "—"}</p></article>
      </div>
      {view === "charts" && <section className="charts-section">
        <div className="chart-panel"><h3>Comparativo de votos</h3><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 18, right: 15, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e8e2" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="votos" radius={[5, 5, 0, 0]}>{chartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Bar></BarChart></ResponsiveContainer></div></div>
        <div className="chart-panel"><h3>Porcentaje por lista</h3><div className="chart-area pie-area"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={62} outerRadius={100} paddingAngle={3}>{pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip formatter={(value) => [`${value} votos`, ""]} /></PieChart></ResponsiveContainer><div className="pie-total"><strong>{total}</strong><span>VOTOS</span></div></div><div className="chart-legend"><span><i style={{ background: COLORS[0] }} /> Opción 1 <b>{percent(count1)}</b></span><span><i style={{ background: COLORS[1] }} /> Opción 2 <b>{percent(count2)}</b></span></div></div>
        <div className="chart-summary"><span>TOTAL GENERAL <strong>{total}</strong></span><span>ACTUALIZACIÓN <strong>{results ? formatDate(results.updatedAt) : "—"}</strong></span></div>
      </section>}
      <section className="control-row"><div><p className="eyebrow">Control del proceso</p><h3>Estado de la votación</h3><p>El reset crea una ronda nueva y conserva el historial anterior.</p></div><div className="control-actions"><button className="button button-open" disabled={results?.open} onClick={() => void setVoting(true)}>ABRIR VOTACIÓN</button><button className="button button-close" disabled={!results?.open} onClick={() => void setVoting(false)}>CERRAR VOTACIÓN</button><button className="button button-reset" disabled={results?.open || resetting} onClick={() => void resetResults()}>{resetting ? "REINICIANDO..." : "RESET A CERO"}</button></div></section>
      <footer className="admin-footer"><span>DATOS ALMACENADOS EN POSTGRESQL</span><span>ACTUALIZACIÓN AUTOMÁTICA CADA 3 SEGUNDOS</span></footer>
    </section>
  </main>;
}

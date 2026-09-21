"use client";
import { useCallback, useEffect, useState } from "react";
import { api, post } from "../../lib/client";

type P = { id: string; name: string; token: string; isAdmin: boolean };

export default function Admin() {
  const [people, setPeople] = useState<P[]>([]), [bootstrap, setBootstrap] = useState(false), [name, setName] = useState(""), [msg, setMsg] = useState(""), [copied, setCopied] = useState("");
  const load = useCallback(async () => {
    try { const r = await api<{ people: P[]; bootstrap?: boolean }>("/api/admin/people"); setPeople(r.people); setBootstrap(!!r.bootstrap); setMsg(""); }
    catch (e) { setMsg((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try { await post("/api/admin/people", { name }); setName(""); load(); } catch (e) { setMsg((e as Error).message); }
  }
  const link = (t: string) => `${location.origin}/?p=${t}`;
  async function copy(p: P) { await navigator.clipboard.writeText(link(p.token)).catch(() => {}); setCopied(p.id); setTimeout(() => setCopied(""), 2000); }

  return (
    <main className="wrap">
      <h1 className="admin-h">Família da viagem</h1>
      <p><a href="/">← Voltar</a></p>
      {msg && <p className="notice" role="alert">{msg}</p>}
      {bootstrap && <p className="banner">Primeiro acesso: a primeira pessoa que você criar (você) vira organizadora e já entra logada.</p>}
      <form className="searchbar" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={bootstrap ? "Seu nome (organizador)" : "Nome da pessoa"} aria-label="Nome" maxLength={40} />
        <button disabled={!name.trim()}>Adicionar</button>
      </form>
      <ul className="people">
        {people.map((p) => (
          <li key={p.id}>
            <div className="grow"><strong>{p.name}{p.isAdmin ? " (organizador)" : ""}</strong><span className="addr">{link(p.token)}</span></div>
            <button className="add wide-btn" onClick={() => copy(p)}>{copied === p.id ? "Copiado!" : "Copiar link"}</button>
          </li>
        ))}
      </ul>
      <p className="muted">Envie a cada pessoa o link dela (WhatsApp). O link é pessoal: quem o tiver entra como aquela pessoa.</p>
    </main>
  );
}

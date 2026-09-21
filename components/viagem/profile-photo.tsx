"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../lib/client";

const VIEW = 280, OUT = 512;

// Editor de foto de perfil: escolher a foto, arrastar e dar zoom para "mirar" na parte desejada (recorte circular).
export function ProfilePhotoEditor({ personId, name, hasPhoto, onClose, onSaved }: { personId?: string; name: string; hasPhoto?: boolean; onClose: () => void; onSaved: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), input = useRef<HTMLInputElement>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null), [zoom, setZoom] = useState(1), [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const base = bmp ? Math.max(VIEW / bmp.width, VIEW / bmp.height) : 1, scale = base * zoom;
  const clamp = (x: number, y: number, s = scale) => bmp ? ({ x: Math.max(-(bmp.width * s - VIEW) / 2, Math.min((bmp.width * s - VIEW) / 2, x)), y: Math.max(-(bmp.height * s - VIEW) / 2, Math.min((bmp.height * s - VIEW) / 2, y)) }) : { x, y };

  function paint(c: HTMLCanvasElement, size: number) {
    if (!bmp) return;
    const k = size / VIEW, ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(bmp, (VIEW / 2 - (bmp.width * scale) / 2 + pos.x) * k, (VIEW / 2 - (bmp.height * scale) / 2 + pos.y) * k, bmp.width * scale * k, bmp.height * scale * k);
  }
  useEffect(() => { if (canvas.current) paint(canvas.current, VIEW); });

  async function choose(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("Escolha uma imagem.");
    try { setBmp(await createImageBitmap(file, { imageOrientation: "from-image" })); setZoom(1); setPos({ x: 0, y: 0 }); setMsg(""); }
    catch { setMsg("Não consegui abrir essa foto. Tente uma JPG ou PNG."); }
  }
  const setZ = (z: number) => { setZoom(z); setPos((p) => clamp(p.x, p.y, base * z)); };

  async function save() {
    if (!bmp) return;
    setBusy(true); setMsg("");
    try {
      const out = document.createElement("canvas"); out.width = out.height = OUT; paint(out, OUT);
      const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", 0.88));
      if (!blob) throw new Error("Não foi possível gerar a imagem.");
      const f = new FormData(); f.set("file", new File([blob], "perfil.jpg", { type: "image/jpeg" })); if (personId) f.set("personId", personId);
      await api("/api/people/photo", { method: "POST", body: f });
      onSaved(); onClose();
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api(`/api/people/photo${personId ? `?personId=${personId}` : ""}`, { method: "DELETE" }); onSaved(); onClose(); } catch (e) { setMsg((e as Error).message); setBusy(false); }
  }

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Foto de perfil de ${name}`}>
        <div className="sheet-head"><h2>Foto de {name}</h2><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => choose(e.target.files?.[0])} />
        {msg && <p className="notice" role="alert">{msg}</p>}
        {!bmp ? (
          <div className="crop-empty">
            <p className="muted">Escolha uma foto e depois arraste e aproxime para enquadrar o rosto.</p>
            <button className="primary" onClick={() => input.current?.click()}>Escolher foto</button>
            {hasPhoto && <button className="link danger" disabled={busy} onClick={remove}>Remover foto atual</button>}
          </div>
        ) : (
          <>
            <div className="crop" style={{ width: VIEW, height: VIEW }}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
              onPointerMove={(e) => { const d = drag.current; if (d) setPos(clamp(d.px + e.clientX - d.x, d.py + e.clientY - d.y)); }}
              onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}
              onWheel={(e) => setZ(Math.max(1, Math.min(4, zoom - e.deltaY / 400)))}>
              <canvas ref={canvas} width={VIEW} height={VIEW} />
              <div className="crop-mask" />
            </div>
            <label className="zoom">Zoom<input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZ(Number(e.target.value))} aria-label="Zoom" /></label>
            <div className="crop-actions">
              <button className="link" onClick={() => input.current?.click()}>Outra foto</button>
              <button className="primary" disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar foto"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

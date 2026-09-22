"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { CATEGORIES, api, compress, type Item } from "../../lib/client";

// Corrige os dados de um lugar (útil para os adicionados à mão: endereço, foto, observação).
export function EditPlace({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: item.title, category: item.category, address: item.address ?? "", note: item.note ?? "" });
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(item.image);
  const [removeImage, setRemoveImage] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function pick(f?: File) {
    if (!f) return;
    setFile(f); setRemoveImage(false); setPreview(URL.createObjectURL(f)); setMsg("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const body = new FormData();
      for (const [k, v] of Object.entries(form)) body.set(k, v);
      if (file) body.set("image", await compress(file));
      if (removeImage) body.set("removeImage", "1");
      await api(`/api/suggestions/${item.id}`, { method: "PUT", body });
      onSaved(); onClose();
    } catch (err) { setMsg((err as Error).message); setBusy(false); }
  }

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Editar ${item.title}`}>
        <div className="sheet-head"><h2>Editar lugar</h2><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        {msg && <p className="notice" role="alert">{msg}</p>}
        <form className="manual" onSubmit={save}>
          <label>Nome<input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Categoria<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{[...new Set([form.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Endereço<input maxLength={250} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, cidade" /></label>
          {!item.placeId && <span className="muted">Ao mudar o endereço, o lugar é reposicionado no mapa.</span>}
          <label>Observação<textarea maxLength={500} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div className="editphoto">
            {preview && !removeImage ? <img src={preview} alt="" /> : <div className="ph" />}
            <div className="grow">
              <button type="button" className="dir" onClick={() => input.current?.click()}>{preview && !removeImage ? "Trocar foto" : "Escolher foto"}</button>
              {item.hasOwnImage && !removeImage && <button type="button" className="link danger" onClick={() => { setRemoveImage(true); setFile(null); setPreview(null); }}>Remover foto</button>}
              {removeImage && <span className="muted">A foto será removida ao salvar.</span>}
            </div>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <button className="primary" disabled={busy || !form.title.trim()}>{busy ? "Salvando…" : "Salvar alterações"}</button>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { uploadPhotos } from "../../lib/client";

// Envia fotos direto para o álbum de um lugar, sem passar pela aba Fotos.
export function PhotoButton({ city, itemId, label, className = "dir photos", onDone }: { city: string; itemId?: string | null; label: string; className?: string; onDone: (sent: number, errors: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

  async function send(files: FileList | null) {
    if (!files?.length) return;
    setBusy({ done: 0, total: files.length });
    const { sent, errors } = await uploadPhotos(Array.from(files), { city, itemId }, (done, total) => setBusy({ done, total }));
    setBusy(null);
    if (input.current) input.current.value = "";
    onDone(sent, errors);
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => send(e.target.files)} />
      <button className={className} disabled={!!busy} onClick={() => input.current?.click()}>
        <Camera size={14} /> {busy ? `Enviando ${busy.done}/${busy.total}…` : label}
      </button>
    </>
  );
}

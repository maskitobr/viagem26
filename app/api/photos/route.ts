import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { items, photos } from "../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../lib/auth";
import { objectKey, validateImage } from "../../../lib/media";
import { putImage } from "../../../lib/r2";
import { isCity } from "../../../lib/scoring";
import { validCoords } from "../../../lib/geo";

// Uma foto por requisição (o cliente envia várias em sequência, já comprimidas).
export async function POST(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const f = await req.formData(), file = f.get("file"), city = f.get("city"), itemId = (f.get("itemId") as string) || null;
    if (!(file instanceof File)) return json({ error: "Escolha uma foto." }, 400);
    if (!isCity(city)) return json({ error: "Escolha o destino da foto." }, 400);
    const { extension } = validateImage(file), db = await getDb();
    if (itemId) {
      const [it] = await db.select({ city: items.city }).from(items).where(eq(items.id, itemId)).limit(1);
      if (!it || it.city !== city) return json({ error: "Esse lugar não pertence a este destino." }, 400);
    }
    const key = objectKey("photos", extension), id = crypto.randomUUID(), taken = Number(f.get("takenAt")), lat = Number(f.get("lat")), lng = Number(f.get("lng")), gps = f.get("lat") && validCoords(lat, lng);
    await putImage(key, new Uint8Array(await file.arrayBuffer()), file.type);
    await db.insert(photos).values({ id, personId: me.id, city, itemId, key, size: file.size, lat: gps ? lat : null, lng: gps ? lng : null, takenAt: taken > 0 ? new Date(taken) : null });
    return json({ id, url: `/api/file/${key}` }, 201);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Envie uma imagem")) return json({ error: e.message }, 400);
    return fail(e, "Não foi possível enviar a foto.");
  }
}

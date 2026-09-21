import { getDb } from "../../../db";
import { itemSeen, items } from "../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../lib/auth";
import { objectKey, validateImage } from "../../../lib/media";
import { putImage } from "../../../lib/r2";
import { isCity } from "../../../lib/scoring";
import { validPhotoName } from "../../../lib/places";

const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const f = await req.formData();
    const city = str(f.get("city"), 30), title = str(f.get("title"), 120);
    if (!isCity(city) || !title) return json({ error: "Informe o destino e o nome do lugar." }, 400);
    let imageKey: string | null = null;
    const file = f.get("image");
    if (file instanceof File && file.size > 0) {
      const { extension } = validateImage(file);
      imageKey = objectKey("items", extension);
      await putImage(imageKey, new Uint8Array(await file.arrayBuffer()), file.type);
    }
    const photoName = str(f.get("photoName"), 300);
    const rating = Number(f.get("rating"));
    const id = crypto.randomUUID();
    const db = await getDb();
    await db.insert(items).values({
      id, city, title, category: str(f.get("category"), 30) ?? "Outro", address: str(f.get("address"), 250),
      mapUrl: str(f.get("mapUrl"), 500) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title} ${city}`)}`,
      placeId: str(f.get("placeId"), 200), note: str(f.get("note"), 500), rating: rating > 0 && rating <= 5 ? rating : null,
      priceLevel: str(f.get("priceLevel"), 10), photoName: photoName && validPhotoName(photoName) ? photoName : null, imageKey, createdBy: me.id,
    });
    await db.insert(itemSeen).values({ personId: me.id, itemId: id }).onConflictDoNothing();
    return json({ id }, 201);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Envie uma imagem")) return json({ error: e.message }, 400);
    return fail(e, "Não foi possível adicionar o lugar.");
  }
}

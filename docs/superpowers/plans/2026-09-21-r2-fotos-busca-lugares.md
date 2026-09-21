# Fotos R2 e Descoberta de Lugares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir fotos de perfil enviadas ao R2 e descoberta colaborativa de restaurantes e passeios via OpenStreetMap.

**Architecture:** Rotas do Fly validam e escrevem arquivos no R2 com credenciais em secrets; uma rota de leitura entrega a imagem com cache. A busca chama Nominatim no servidor com limitação e cache, enquanto sugestões persistem no Neon e reaproveitam votos e comentários pelo identificador `suggestion:<id>`.

**Tech Stack:** React 19, Vinext, TypeScript, Drizzle ORM, Neon PostgreSQL, Cloudflare R2 S3 API, OpenStreetMap Nominatim, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-colaboracao-r2-busca-design.md`

## Global Constraints

- Aceitar somente JPG, PNG e WebP de até 5 MB.
- Nunca expor as quatro credenciais R2 no navegador.
- Usar limite de uma consulta Nominatim por segundo por instância e cache de 15 minutos.
- Limitar campos textuais e fornecer mensagens de erro sem detalhes internos.
- Os controles novos terão rótulos acessíveis e feedback de carregamento/erro.

---

## File Structure

- `lib/media.ts`: validação de arquivo e geração de chaves R2.
- `lib/r2.ts`: cliente S3 compatível e resposta de imagem.
- `lib/places.ts`: consulta, normalização, cache e limite de Nominatim.
- `lib/suggestions.ts`: identificador colaborativo da sugestão.
- `app/api/uploads/route.ts`, `app/api/photos/[key]/route.ts`: upload e leitura segura.
- `app/api/places/search/route.ts`, `app/api/suggestions/route.ts`: busca e ideias persistidas.
- `db/schema.ts`, `drizzle/0001_add_suggestions.sql`: tabela de sugestões.
- `app/page.tsx`, `app/globals.css`: interface de perfil, busca, formulário manual e cartões.
- `tests/*.test.ts`: contratos de validação e normalização com Vitest.

### Task 1: Contrato de mídia e R2

**Files:**
- Create: `lib/media.ts`, `lib/r2.ts`, `app/api/uploads/route.ts`, `app/api/photos/[key]/route.ts`, `tests/media.test.ts`, `tests/r2.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `validateImage(file): { extension: "jpg" | "png" | "webp" }` and `objectKey(kind, extension): string`.
- Produces `putImage(key, body, contentType)` and `getImage(key)`.
- `POST /api/uploads` accepts `FormData` field `file` and `kind` (`profiles` or `ideas`).

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { objectKey, validateImage } from "../lib/media";

describe("media", () => {
  it("accepts WebP and rejects PDF larger than 5 MB", () => {
    expect(validateImage({ type: "image/webp", size: 2_000_000 })).toEqual({ extension: "webp" });
    expect(() => validateImage({ type: "application/pdf", size: 6_000_000 })).toThrow("Envie uma imagem JPG, PNG ou WebP de até 5 MB.");
  });
  it("uses only an allowed object prefix", () => expect(objectKey("profiles", "jpg")).toMatch(/^profiles\/[0-9a-f-]+\.jpg$/));
});
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- tests/media.test.ts`

Expected: FAIL because test script and `lib/media.ts` do not exist.

- [ ] **Step 3: Implement minimum green**

Add `vitest`, `@aws-sdk/client-s3`, and `"test": "vitest run"`. Accept the three image MIME types and generate UUID keys below `profiles/` or `ideas/`. Configure R2 with endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, `region: "auto"`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. The upload route checks size/type, stores `Uint8Array(await file.arrayBuffer())`, and returns `{ key, url: "/api/photos/" + key }`. The read route rejects keys not matching `^(profiles|ideas)/[0-9a-f-]+\.(jpg|png|webp)$`, returns 404 when absent, and responds with immutable one-year cache headers.

- [ ] **Step 4: Verify green**

Run: `npm run test -- tests/media.test.ts tests/r2.test.ts`

Expected: PASS; the R2 response test asserts `Content-Type: image/png` and `Cache-Control` contains `max-age=31536000`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib app/api/uploads app/api/photos tests
git commit -m "feat: add private R2 image uploads"
```

### Task 2: Lugares gratuitos e ideias persistidas

**Files:**
- Create: `lib/places.ts`, `lib/suggestions.ts`, `app/api/places/search/route.ts`, `app/api/suggestions/route.ts`, `drizzle/0001_add_suggestions.sql`, `tests/places.test.ts`
- Modify: `db/schema.ts`

**Interfaces:**
- `searchPlaces(query, city): Promise<PlaceResult[]>`, where `PlaceResult` is `{ sourceId, title, address, type, mapQuery }`.
- `activityIdForSuggestion(id): string` returns `suggestion:${id}`.
- `POST /api/suggestions` accepts `{ participantId, city, title, category, address?, mapQuery?, note?, imageKey?, source }`.
- `GET /api/suggestions?city=Chicago` returns the city’s saved ideas.

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { normalizePlace } from "../lib/places";

describe("normalizePlace", () => {
  it("returns a map-ready restaurant", () => {
    expect(normalizePlace({ place_id: 9, display_name: "Lou's, Chicago, Illinois, United States", type: "restaurant" })).toEqual({
      sourceId: "9", title: "Lou's", address: "Chicago, Illinois, United States", type: "restaurant", mapQuery: "Lou's, Chicago, Illinois, United States"
    });
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- tests/places.test.ts`

Expected: FAIL because `normalizePlace` does not exist.

- [ ] **Step 3: Implement minimum green**

Create `suggestions(id, city, title, category, address, map_query, note, image_key, source, created_by, created_at)`. Query Nominatim with bounded query plus city/USA, `format=jsonv2`, `limit=8`, `addressdetails=1`, and a clear `User-Agent`; cache query/city pairs for 15 minutes and delay a new upstream request until one second after the prior one. Permit only Chicago, Dallas and Orlando. Limit text fields before inserting a suggestion.

- [ ] **Step 4: Verify green and apply database migration**

Run: `npm run test -- tests/places.test.ts`

Expected: PASS.

Then execute `drizzle/0001_add_suggestions.sql` in the Neon SQL editor and confirm the `suggestions` table exists.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts drizzle lib/places.ts lib/suggestions.ts app/api/places app/api/suggestions tests/places.test.ts
git commit -m "feat: add free place discovery and suggestions"
```

### Task 3: Interface e imagens coerentes

**Files:**
- Modify: `app/page.tsx`, `app/globals.css`
- Create: `tests/ui-data.test.ts`

**Interfaces:**
- Consumes the upload, search, suggestions and activities routes.
- Uses `activityIdForSuggestion(suggestion.id)` for votes and comments.

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { activityIdForSuggestion } from "../lib/suggestions";

describe("activity id", () => {
  it("isolates suggestion votes", () => expect(activityIdForSuggestion("abc")).toBe("suggestion:abc"));
});
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- tests/ui-data.test.ts`

Expected: FAIL because `lib/suggestions.ts` is absent before Task 2.

- [ ] **Step 3: Implement minimum green**

Replace the photo URL input with labelled upload, preview, busy/disabled state and near-field errors. Add a “Descubra lugares” panel with search, result list, Google Maps links, “Adicionar às ideias”, and a disclosure form for manual entry with title, category, address/link, note and optional photo. Render saved suggestions beneath base cards and reuse votes/comments. Replace every generic static remote image with one visually verified to match its title; give each image descriptive alt text.

- [ ] **Step 4: Verify green**

Run: `npm run test && npm run build`

Expected: all tests PASS and Vinext build exits 0.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/globals.css lib/suggestions.ts tests/ui-data.test.ts
git commit -m "feat: add collaborative place discovery interface"
```

### Task 4: Documentar e publicar

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document settings**

Document the four R2 secret names, accepted file limits, migration file, and public endpoint checks without credential values.

- [ ] **Step 2: Final verification**

Run: `npm run test && npm run build && flyctl deploy --remote-only`

Expected: tests/build pass and Fly reports a healthy machine.

- [ ] **Step 3: Validate public endpoints**

```bash
curl --fail https://central-da-viagem.fly.dev/
curl --fail 'https://central-da-viagem.fly.dev/api/places/search?q=pizza&city=Chicago'
curl --fail 'https://central-da-viagem.fly.dev/api/suggestions?city=Chicago'
```

Expected: HTML, JSON search results of at most eight places, and a JSON suggestions array.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: explain R2 and place discovery operations"
```


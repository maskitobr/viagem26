# Planejamento em família: identidade, votos, "NOVO!" e mural de fotos

## Objetivo

Transformar o app em uma ferramenta de planejamento coletivo da viagem (Chicago, Dallas, Orlando): a família busca lugares, adiciona à lista de cada destino, vota para priorizar, vê o que é novo e reúne as fotos da viagem em um mural por destino e por lugar.

## Decisões aprovadas

- **Identidade**: lista fixa de pessoas, cada uma com link pessoal (`/?p=<token>`), token guardado em cookie. Sem senha.
- **Admin**: `/admin?key=<ADMIN_KEY>` cria pessoas e mostra o link de cada uma. `ADMIN_KEY` é secret no Fly.
- **Votos**: três níveis por pessoa por item: Quero muito (2), Talvez (1), Passo (0). Mutável.
- **Busca de lugares**: Google Places API (New), chamada apenas pelo servidor com `GOOGLE_PLACES_API_KEY`. Cache em memória e limite de buscas por pessoa.
- **Fotos**: upload múltiplo, vinculado a destino (obrigatório) e a um lugar da lista (opcional), guardado no R2, com filtro por autor.
- **Deploy**: push na `main` publica no Fly (já configurado).

## Dados (Neon, migrações Drizzle idempotentes aplicadas na inicialização)

- `people(id, name, color, token unique, is_admin, created_at)`
- `suggestions` (existente) ganha `place_id`, `rating`, `price_level`, `photo_ref`/`image_key`; `created_by` referencia `people.id`.
- `votes(person_id, suggestion_id, choice in quero|talvez|passo)` com unicidade por pessoa e item.
- `seen(person_id, suggestion_id, seen_at)`.
- `photos(id, person_id, city, suggestion_id null, r2_key, taken_at, width, height, created_at)`.

## API (todas exigem cookie de pessoa, exceto `/admin` que exige `ADMIN_KEY`)

- `GET /api/me`, `POST /api/session` (troca token por cookie)
- `GET/POST /api/items`, `PATCH/DELETE /api/items/:id` (só autor ou admin)
- `POST /api/items/:id/vote`, `POST /api/items/:id/seen`
- `GET /api/places/search?q&city` (Google Places; erro claro se a chave faltar)
- `POST /api/photos/sign` (URLs pré-assinadas de upload no R2), `POST /api/photos` (registra), `GET /api/photos?city&by&item`
- `GET /api/photos/file/:key` (leitura do R2 com cache)

## "NOVO!"

Item criado por outra pessoa e sem linha em `seen` para quem está vendo recebe o selo. Some ao votar ou abrir o item. Cada aba de destino mostra o contador; banner com o número de itens novos e quem adicionou.

## Interface

Mobile primeiro. Abas de destino, lista ordenada por pontuação, seção "Prioridades" no topo, busca "Descubra lugares", aba "Fotos" com upload múltiplo (compressão no cliente), grade por destino/lugar, filtro por autor, visualizador em tela cheia e download.

## Erros e limites

Mensagens em português para busca indisponível, chave ausente, falha de upload e falta de conexão. Imagens JPG/PNG/WebP/HEIC convertidas no cliente; tamanho limitado após compressão.

## Verificação

Testes automatizados de pontuação de votos, regra do "NOVO!" e validação de upload; verificação no navegador em tamanho de celular contra um Postgres local antes de qualquer push.

## Pendências do usuário

Criar `GOOGLE_PLACES_API_KEY` e `ADMIN_KEY` e registrá-las com `fly secrets set`.

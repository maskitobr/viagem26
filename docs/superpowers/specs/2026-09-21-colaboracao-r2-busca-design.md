# Fotos e descoberta colaborativa

## Objetivo

Permitir que o grupo da viagem envie uma foto de perfil, descubra lugares sem API paga, adicione restaurantes e passeios às cidades e decida tudo por votos e comentários.

## Decisões aprovadas

- Armazenar fotos de perfil no bucket Cloudflare R2 `viagem`.
- Manter credenciais exclusivamente nos secrets do Fly.
- Usar dados do OpenStreetMap/Nominatim para pesquisa gratuita de lugares.
- Abrir o resultado no Google Maps por uma URL de consulta, sem consumir ou copiar dados da API do Google.
- Corrigir as imagens estáticas do roteiro para que representem o local descrito.

## Experiência

### Foto de perfil

No modal de entrada, o participante informa o nome e escolhe uma imagem JPG, PNG ou WebP de até 5 MB. A interface mostra uma prévia e bloqueia formatos e tamanhos não permitidos. Depois de salvo, o avatar aparece ao lado do nome em votos e comentários.

### Descobrir lugares

Cada cidade terá uma barra “Descubra lugares”. A consulta acrescenta automaticamente o nome da cidade e dos Estados Unidos, por exemplo: `pizza Chicago, USA`. A tela apresenta nome, tipo e endereço retornados pelo OpenStreetMap e oferece três ações: abrir no Google Maps, adicionar às ideias e cancelar.

Ao adicionar, a pessoa escolhe uma categoria (restaurante, passeio, compras ou outra), uma nota opcional e, se quiser, uma foto enviada ao R2. A nova ideia passa a ser um cartão compartilhado com votos e comentários como os itens do roteiro original.

## Arquitetura

```text
Navegador
  ├─ POST /api/uploads ──> Fly ──> R2 bucket viagem
  ├─ GET /api/photos/:key ──> Fly ──> R2 bucket viagem
  ├─ GET /api/places/search?q=...&city=... ──> Nominatim
  └─ POST /api/suggestions e /api/activities ──> Neon
```

O navegador nunca recebe credenciais R2. O Fly valida tipo e tamanho, grava em uma chave aleatória `profiles/<uuid>.<ext>` ou `ideas/<uuid>.<ext>` e persiste somente a chave do objeto no Neon. A rota de leitura devolve a imagem com cabeçalhos de cache.

## Dados

Além das tabelas existentes, será criada a tabela `suggestions`:

- `id` UUID/texto;
- `city`, `title`, `category`, `address`, `map_query` e `note`;
- `image_key` opcional;
- `created_by` (participante), `created_at`;
- `source` fixado como `openstreetmap` ou `manual`.

Votos e comentários continuarão usando `itinerary_id`; sugestões usarão o identificador `suggestion:<id>` para reaproveitar o mural colaborativo sem duplicar regras.

## Integrações e limites

### R2

Secrets exigidos no Fly: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`. O aplicativo usa a API S3 compatível do R2 com região `auto`.

### Pesquisa

O servidor envia um `User-Agent` identificável ao Nominatim, aplica limite de uma busca por segundo por instância e guarda resultados de pesquisa em memória por 15 minutos. Isso é adequado ao uso ocasional de um grupo de seis pessoas e reduz chamadas repetidas ao serviço público.

Se o serviço estiver indisponível, a interface mantém o formulário “Adicionar ideia manualmente”, incluindo nome, categoria, endereço/link e foto opcional.

## Segurança e qualidade

- Imagens: aceitar apenas JPG, PNG e WebP, no máximo 5 MB.
- Gerar chaves R2 no servidor; não aceitar caminho definido pelo visitante.
- Limitar campos textuais e consultas.
- Tratar falhas externas com mensagens amigáveis, sem expor credenciais ou detalhes internos.
- Usar controles acessíveis, feedback de envio/procura e foco de teclado visível.
- Trocar as imagens existentes por imagens verificadas que correspondam a cada atração.

## Verificação

- Testes de validação para arquivo, busca e criação de sugestão.
- Build de produção.
- Prévia local: envio e leitura de imagem com credenciais de desenvolvimento quando disponíveis.
- Após o deploy: verificar página, rota do mural, busca e criação de uma sugestão de teste.

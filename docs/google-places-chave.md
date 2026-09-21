# Como criar a chave do Google Places e ativar a busca

A busca de lugares usa a **Places API (New)**. Sem a chave, o app funciona normalmente e a pessoa adiciona lugares "à mão"; com a chave, aparecem fotos, nota, preço e link do Maps.

## 1. Criar o projeto e ativar a API
1. Abra <https://console.cloud.google.com/> e entre com sua conta Google.
2. No topo, clique no seletor de projetos → **Novo projeto** → nome `viagem-2026` → **Criar**.
3. Menu ☰ → **Faturamento** e vincule um cartão (o Google exige, mesmo dentro da cota gratuita).
4. Menu ☰ → **APIs e serviços → Biblioteca**, procure **Places API (New)** e clique em **Ativar**.

## 2. Criar a chave
1. **APIs e serviços → Credenciais → Criar credenciais → Chave de API**. Copie a chave.
2. Clique em **Editar chave** e configure:
   - **Restrições de API** → *Restringir chave* → marque somente **Places API (New)**.
   - (A chave só é usada pelo servidor, então não use restrição por site/referenciador.)

## 3. Limitar o custo (recomendado)
- **APIs e serviços → Places API (New) → Cotas e limites do sistema**: reduza o limite diário de *Text Search* (por exemplo, 200 por dia).
- **Faturamento → Orçamentos e alertas**: crie um orçamento de US$ 5 com alerta por e-mail.
- Para 6 pessoas planejando uma viagem, o uso fica muito abaixo da cota gratuita mensal do Google.

## 4. Colocar a chave no app (Fly.io)
```bash
fly secrets set GOOGLE_PLACES_API_KEY="cole-a-chave-aqui" -a central-da-viagem
```
O Fly reinicia o app sozinho. Pronto: no botão "Adicionar lugar", a aba **Buscar no Google** passa a funcionar.

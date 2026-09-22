# Como ligar a busca automática de voos

Com a chave, você digita o número do voo e a data e o app preenche companhia, aeroportos, horários e terminal. Sem a chave, o cadastro manual continua funcionando normalmente.

## 1. Assinar o plano gratuito

1. Abra a página de planos: <https://rapidapi.com/aedbx-aedbx/api/aerodatabox/pricing>
2. Na coluna **Basic — $0.00/mo**, clique em **Start Free Plan**. É o único botão dessa coluna; as outras colunas dizem "Choose This Plan" e são pagas.
3. O plano gratuito não pede cartão. Ele dá 400 unidades (cerca de 200 buscas de voo) por mês, com limite rígido — ou seja, não vira cobrança se acabar.

## 2. Copiar a chave

Depois de assinar, siga por um destes caminhos:

- **Pelo teste da API:** abra <https://rapidapi.com/aedbx-aedbx/api/aerodatabox/playground> e escolha qualquer endpoint. No painel da direita, no exemplo de código, aparece a linha `'x-rapidapi-key': '...'`. Esse valor é a sua chave.
- **Pelo painel do desenvolvedor:** abra <https://rapidapi.com/developer/apps>, entre em **default-application** e procure **Application Key**. Clique no olho para revelar e copie.

A chave é um texto longo, com cerca de 50 caracteres.

## 3. Colocar a chave no app

```bash
fly secrets set AERODATABOX_API_KEY="cole-a-chave-aqui" -a central-da-viagem
```

O Fly reinicia o app sozinho, em menos de um minuto.

## 4. Usar

Na aba **Voos**, toque em **Adicionar voo**, deixe em "Pelo número", digite algo como `LA8180` e a data da partida. Confirme o voo encontrado: ele entra na lista, na agenda, e os aeroportos de origem e destino viram lugares com álbum de fotos.

## Observações

- O app guarda cada busca por 6 horas, para não gastar a cota à toa.
- Se a cota acabar, o voo não for encontrado ou a companhia ainda não tiver publicado o horário, use a aba **À mão**.
- O plano gratuito exige dar crédito à fonte: o app mostra "Dados do voo: AeroDataBox" nos voos trazidos pela busca.

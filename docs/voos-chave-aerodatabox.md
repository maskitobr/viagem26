# Como ligar a busca automática de voos

Com a chave, você digita o número do voo e a data e o app preenche companhia, aeroportos, horários e terminal. Sem a chave, o cadastro manual continua funcionando normalmente.

## 1. Criar a chave (gratuita)
1. Acesse <https://rapidapi.com/aedbx-aedbx/api/aerodatabox> e crie uma conta (pode entrar com o Google).
2. Na página da API, clique em **Subscribe to Test** e escolha o plano **Basic (Free)**. O plano básico não pede cartão.
3. Volte para a aba **Endpoints**. No painel da direita, em `X-RapidAPI-Key`, clique no olho para revelar a chave e copie.

## 2. Colocar a chave no app
```bash
fly secrets set AERODATABOX_API_KEY="cole-a-chave-aqui" -a central-da-viagem
```
O Fly reinicia o app sozinho.

## 3. Usar
Na aba **Voos**, toque em **Adicionar voo**, deixe em "Pelo número", digite algo como `LA8180` e a data da partida. O app mostra o voo encontrado; confirme e ele entra na lista, na agenda e cria os aeroportos de origem e destino como lugares com álbum de fotos.

## Observações
- O plano gratuito tem cota mensal limitada; o app guarda cada busca por 6 horas para não gastar à toa.
- Se a cota acabar ou o voo não for encontrado, use a aba **À mão** e preencha com os dados do e-mail da companhia.
- Para voos muito no futuro, algumas companhias só publicam o horário algumas semanas antes; nesse caso o cadastro manual resolve.

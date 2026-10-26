# Império dos Reinos

Jogo de estratégia medieval em português, iniciado do zero no repositório NANDOBRTV/rpg-online.

## Protótipo atual
- Interface adaptada para celular e computador.
- Construções: serraria, pedreira, fazenda e muralha.
- Recursos, produção passiva e treinamento de infantaria.
- Salvamento local no navegador.
- Servidor Node.js/Express com rota de saúde em `/health`.

## Executar
1. Instale Node.js 18 ou superior.
2. Execute `npm install`.
3. Execute `npm start`.
4. Abra `http://localhost:3000`.

## Próximas etapas
1. Banco de dados persistente no servidor.
2. Cadastro, login seguro e recuperação de conta.
3. Sincronização de progresso entre dispositivos.
4. Multiplayer, alianças, mapa e batalhas online.

**Nota:** este commit entrega a base jogável inicial. O protótipo ainda não tem contas reais nem estado compartilhado entre jogadores; o progresso atual fica no navegador do jogador.

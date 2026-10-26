# Império dos Reinos

Jogo de estratégia medieval em português, iniciado no repositório NANDOBRTV/rpg-online.

## Protótipo atual
- Interface responsiva para celular e computador.
- Recursos: madeira, pedra, comida e ouro.
- Construções: serraria, pedreira, fazenda e muralha.
- Produção passiva e treinamento de infantaria.
- Missões com recompensas resgatáveis uma vez por navegador.
- Histórico público de versões em [Atualizações do jogo](https://rpg-online-u92m.onrender.com/updates.html).
- Cadastro e login por e-mail e senha com Supabase Auth.
- Salvamento do estado do reino no projeto Supabase separado `imperio-dos-reinos`.
- Sincronização entre dispositivos ao entrar na mesma conta.
- Salvamento local como apoio quando a sincronização não estiver disponível.
- Acesso ao banco protegido por Row Level Security (RLS), limitado ao usuário autenticado.

## Executar
1. Instale Node.js 18 ou superior.
2. Execute `npm install`.
3. Execute `npm start`.
4. Abra `http://localhost:3000`.

## Próximas etapas
1. Mapa do mundo e exploração.
2. Alianças entre jogadores.
3. Batalhas online e classificação.

## Histórico
- **v0.3.0:** cadastro/login, salvamento na nuvem e sincronização entre dispositivos via Supabase.
- **v0.2.0:** página de atualizações e sistema inicial de missões.
- **v0.1.0:** base jogável com construções, recursos e quartel.

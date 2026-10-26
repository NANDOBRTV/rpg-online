# Império dos Reinos

Jogo de estratégia medieval em português, iniciado no repositório NANDOBRTV/rpg-online.

## Protótipo atual
- Interface responsiva para celular e computador.
- Tela inicial, tela de login/cadastro e área de jogo separadas.
- Tela de login personalizada com identidade visual medieval-futurista, campos acessíveis e atalhos separados para entrar, criar conta ou jogar como visitante.
- Opção de jogar como visitante após a tela de login.
- Fluxo do jogo: login, carregamento do reino, prólogo da história e mapa principal.
- Mapa principal com atalhos organizados para Reino, Exploração, Alianças e Batalhas online.
- Recursos: madeira, pedra, comida e ouro.
- Construções: serraria, pedreira, fazenda e muralha.
- Produção passiva e treinamento de infantaria.
- Missões com recompensas resgatáveis por reino.
- Mapa de seis territórios com exploração e recompensas únicas.
- Alianças compartilhadas entre jogadores (até 20 membros).
- Gestão de aliança: lista de membros, transferência de liderança e remoção de membros pelo líder.
- Batalhas online, relatos de combate e ranking de poder.
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
1. Melhor balanceamento das batalhas e proteção antitrapaça no servidor.
2. Mais territórios, missões de exploração e eventos.
3. Temporadas de classificação e objetivos de aliança.

## Histórico
- **v0.8.0:** redesenho responsivo da tela de login com visual medieval-futurista e navegação de acesso mais clara.
- **v0.7.0:** fluxo login → carregamento → história → mapa principal, com atalhos distribuídos por área.
- **v0.6.0:** separação inicial das telas de acesso e jogo.
- **v0.5.0:** gestão de alianças, transferência de liderança e remoção de membros.
- **v0.4.0:** mapa explorável, alianças, batalhas online, relatos e ranking.
- **v0.3.0:** cadastro/login, salvamento na nuvem e sincronização entre dispositivos via Supabase.
- **v0.2.0:** página de atualizações e sistema inicial de missões.
- **v0.1.0:** base jogável com construções, recursos e quartel.

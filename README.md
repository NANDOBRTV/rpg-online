# Império dos Reinos

Projeto de jogo de estratégia medieval em português, no repositório [NANDOBRTV/rpg-online](https://github.com/NANDOBRTV/rpg-online).

## Etapa atual: portal de login

A interface publicada está temporariamente reduzida à tela de login e cadastro. O objetivo é desenvolver, testar e estabilizar cada parte antes de reconstruir o restante do jogo.

- Layout responsivo para celular e computador, com identidade visual medieval-futurista.
- Login e cadastro por e-mail e senha usando Supabase Auth.
- Mensagens de estado acessíveis para carregamento, sucesso e erro.
- Botão para sair da conta quando existe sessão.
- Sem telas de jogo, modo visitante, mapas, alianças, batalhas ou salvamento de partidas na interface atual.
- O servidor Express e a configuração do projeto foram preservados.
- Projeto Supabase mantido: `imperio-dos-reinos` (`yidefbyhfpsgfjzzlarl`).

## Dados e contas

Em 26 de outubro de 2026, a inspeção encontrou 1 conta cadastrada e 1 registro em cada uma destas tabelas: `kingdom_saves`, `kingdom_profiles`, `alliances` e `alliance_members`; `battle_reports` estava vazia. Por solicitação explícita, as contas cadastradas e os dados de jogo associados foram apagados. A estrutura das tabelas e o projeto Supabase foram preservados.

## Executar localmente

1. Instale Node.js 18 ou superior.
2. Execute `npm install`.
3. Execute `npm start`.
4. Abra `http://localhost:3000`.

## Próximas etapas

1. Testar login, cadastro, sessão e saída da conta.
2. Ajustar detalhes visuais e mensagens da autenticação.
3. Reconstruir a próxima tela somente depois de validar o portal de login.

## Histórico

- **v0.9.0:** interface ativa simplificada para login/cadastro; remoção das telas e funcionalidades de jogo da interface atual; limpeza das contas e dos dados associados solicitada.
- **v0.8.0:** redesenho responsivo da tela de login.
- **v0.7.0:** fluxo login → carregamento → história → mapa principal.
- **v0.6.0:** separação inicial das telas de acesso e jogo.
- **v0.5.0:** gestão de alianças, transferência de liderança e remoção de membros.
- **v0.4.0:** mapa explorável, alianças, batalhas online, relatos e ranking.
- **v0.3.0:** cadastro/login e salvamento na nuvem via Supabase.
- **v0.2.0:** página de atualizações e sistema inicial de missões.
- **v0.1.0:** base jogável com construções, recursos e quartel.

Histórico de versões: [Atualizações do projeto](https://rpg-online-u92m.onrender.com/updates.html).

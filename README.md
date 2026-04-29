# 🎮 Herdeiro do Vento RPG

Um **MMORPG multiplayer** inspirado em correntes de ar, desenvolvido com Node.js, Express, Socket.io e Canvas. Suporta múltiplos jogadores em tempo real com sistema de combate, itens, quests e clãs.

## ✨ Versão 2.0 - Melhorias Completas

### 🆕 Novas Funcionalidades

#### 1. **Sistema de Banco de Dados Robusto**
- Migração de JSON para **SQLite3**
- Persistência completa de dados do jogador
- Tabelas para usuários, inventário, quests, bestiário, clãs e habilidades
- Backup automático de progresso

#### 2. **Sistema de Itens Avançado**
- **5 Raridades**: Comum, Incomum, Raro, Épico, Lendário
- **Estatísticas Dinâmicas**: Força, Agilidade, Inteligência, Vitalidade
- **Tipos de Itens**: Armas, Armaduras, Acessórios, Consumíveis
- **Loot Procedural**: Drops aleatórios com raridades baseadas em inimigos

#### 3. **Novos Inimigos e Mapas**
- **6 Tipos de Inimigos**: Slime, Goblin, Orc, Lobo Sombrio, Mago Negro, Dragão Menor
- **3 Mapas Exploráveis**: Vila, Floresta, Caverna Sombria
- **Sistema de Boss**: Dragão Menor com drops especiais
- **Spawn Dinâmico**: Inimigos aparecem continuamente baseado na população

#### 4. **Sistema de Clãs/Guildas**
- Criar e gerenciar clãs
- Adicionar membros com diferentes papéis (Líder, Membro)
- Tesouro compartilhado do clã
- Níveis de clã com benefícios

#### 5. **Interface Melhorada**
- **Design Moderno**: Gradientes, animações e efeitos visuais
- **Responsividade Total**: Funciona em desktop, tablet e mobile
- **Temas Dinâmicos**: Ciclo dia/noite no mundo
- **Efeitos Visuais**: Partículas, textos flutuantes, barras de HP animadas
- **6 Abas de Menu**: Mochila, Atributos, Skills, Missões, Codex, Clãs

#### 6. **Melhorias de Gameplay**
- **Mais Habilidades**: 3 skills por classe (Ninja, Guerreiro, Mago)
- **Sistema de Quests Expandido**: 4 quests diferentes com objetivos variados
- **Bestiário Completo**: Rastreamento de inimigos derrotados
- **Suporte a Teclado**: Controles com WASD + Espaço
- **Chat Melhorado**: Mensagens de sistema e notificações

#### 7. **Balanceamento e Performance**
- Cálculo de dano com base em stats do jogador
- Defesa baseada em vitalidade
- Spawn inteligente de inimigos por mapa
- Otimização de rede com Socket.io

---

## 🚀 Como Instalar e Executar

### Pré-requisitos
- Node.js 14+ instalado
- npm ou yarn

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/NANDOBRTV/rpg-online.git
cd rpg-online

# Instalar dependências
npm install

# Executar o servidor
npm start
```

O servidor estará disponível em `http://localhost:3000`

---

## 🎮 Como Jogar

### Criação de Conta
1. Escolha seu nome de usuário (3+ caracteres)
2. Defina uma senha (4+ caracteres)
3. Selecione sua classe: **Ninja**, **Guerreiro** ou **Mago**
4. Clique em "CRIAR CONTA"

### Login
1. Digite suas credenciais
2. Selecione sua classe
3. Clique em "ENTRAR"

### Controles

#### Desktop
- **A / Seta Esquerda**: Mover para esquerda
- **D / Seta Direita**: Mover para direita
- **Espaço**: Pular
- **Clique Esquerdo (ATK)**: Atacar
- **Enter**: Enviar mensagem no chat

#### Mobile
- **◀ / ▶**: Mover
- **PULO**: Pular
- **⚔️ ATK**: Atacar

### Mecânicas de Jogo

#### Combate
- Ataque automático ao se aproximar de inimigos
- Dano baseado em Força + equipamento
- Defesa baseada em Vitalidade
- Cooldown entre ataques

#### Progressão
- Ganhe XP derrotando inimigos
- Suba de nível a cada 300 XP
- Desbloqueie pontos de atributo ao subir de nível
- Melhore seus stats: Força, Agilidade, Inteligência, Vitalidade

#### Loot
- Inimigos dropam ouro e itens
- Itens com raridades diferentes
- Venda de itens para ouro
- Equipar itens para ganhar bônus de stats

#### Quests
- Aceite missões no menu
- Rastreie progresso em tempo real
- Ganhe recompensas ao completar
- Desbloqueie novas quests conforme progride

#### Clãs
- Crie um clã com amigos
- Compartilhe tesouro do clã
- Coopere em combates
- Suba o nível do clã

---

## 🎯 Classes

### 🥷 Ninja
- **HP**: 120
- **Dano**: 25
- **Velocidade**: 8 (Rápido)
- **Alcance**: 110
- **Habilidades**: Corte Sombrio, Passo de Vento, Invisibilidade

### ⚔️ Guerreiro
- **HP**: 280 (Resistente)
- **Dano**: 35
- **Velocidade**: 5
- **Alcance**: 140
- **Habilidades**: Impacto Terrestre, Escudo de Ferro, Grito de Guerra

### 🔮 Mago
- **HP**: 110
- **Dano**: 60 (Alto)
- **Velocidade**: 6
- **Alcance**: 500 (Muito Longo)
- **Habilidades**: Explosão Arcana, Barreira Mágica, Teleporte

---

## 📊 Estatísticas

### Atributos
| Atributo | Efeito |
|----------|--------|
| **Força (STR)** | +2 Dano por ponto |
| **Agilidade (AGI)** | +0.3 Velocidade por ponto |
| **Inteligência (INT)** | Futuro: Mana e magia |
| **Vitalidade (VIT)** | +15 HP máximo por ponto, -0.5 Dano recebido |

### Raridades de Itens
| Raridade | Cor | Multiplicador | Chance |
|----------|-----|----------------|--------|
| Comum | Cinza | 1.0x | 60% |
| Incomum | Verde | 1.2x | 25% |
| Raro | Azul | 1.5x | 10% |
| Épico | Roxo | 2.0x | 4% |
| Lendário | Dourado | 2.5x | 1% |

---

## 🗺️ Mapas

### Vila
- Primeira área segura
- Spawn de Slimes
- Ideal para iniciantes

### Floresta
- Área intermediária
- Múltiplos inimigos: Goblin, Orc, Lobo Sombrio, Mago Negro
- Dropam itens melhores

### Caverna Sombria
- Área avançada
- Spawn do Dragão Menor (Boss)
- Itens épicos e lendários

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas SQLite

```sql
-- Usuários
users (id, username, password, level, xp, gold, stats, ...)

-- Inventário
inventory (id, user_id, item_id, item_name, rarity, quantity, stats)

-- Quests
quests (id, user_id, quest_id, title, current_progress, goal, completed)

-- Bestiário
bestiary (id, user_id, enemy_name, kills)

-- Clãs
clans (id, clan_id, clan_name, leader_id, level, treasury)

-- Membros de Clã
clan_members (id, clan_id, user_id, role, joined_at)

-- Habilidades
skills (id, user_id, skill_name, level, unlocked)
```

---

## 🔧 Arquitetura

### Frontend
- **HTML5 Canvas**: Renderização 2D do jogo
- **Socket.io Client**: Comunicação em tempo real
- **Vanilla JavaScript**: Sem dependências externas
- **CSS3**: Animações e responsividade

### Backend
- **Node.js + Express**: Servidor web
- **Socket.io**: WebSockets para multiplayer
- **SQLite3**: Persistência de dados
- **bcryptjs**: Criptografia de senhas
- **UUID**: Geração de IDs únicos

### Protocolo de Rede
- Eventos Socket.io para login, input, chat, combate
- Sincronização de estado do mundo a cada 33ms (~30 FPS)
- Broadcast de eventos para jogadores na mesma sala

---

## 📁 Estrutura de Arquivos

```
rpg-online/
├── server/
│   ├── index.js          # Servidor principal
│   ├── database.js       # Sistema SQLite
│   ├── items.js          # Sistema de itens
│   ├── enemies.js        # Sistema de inimigos
│   └── game.db           # Banco de dados (gerado)
├── public/
│   ├── index.html        # Interface HTML
│   ├── game.js           # Lógica do cliente
│   ├── style.css         # Estilos e animações
│   └── socket.io/        # Biblioteca Socket.io (servida)
├── package.json          # Dependências
└── README.md             # Este arquivo
```

---

## 🐛 Troubleshooting

### Porta 3000 já está em uso
```bash
# Mudar porta
PORT=3001 npm start
```

### Erro de banco de dados
```bash
# Deletar banco de dados corrompido
rm server/game.db
npm start  # Recria o banco
```

### Conexão Socket.io falha
- Verificar firewall
- Verificar se o servidor está rodando
- Limpar cache do navegador

---

## 🚀 Melhorias Futuras

- [ ] Sistema de magia e mana
- [ ] Dungeons instanciadas
- [ ] PvP entre jogadores
- [ ] Loja de itens
- [ ] Sistema de amigos
- [ ] Ranking global
- [ ] Animações de habilidades
- [ ] Efeitos de som
- [ ] Tradução para múltiplos idiomas
- [ ] Mobile app nativa

---

## 📝 Licença

MIT License - Veja LICENSE para detalhes

---

## 👥 Contribuições

Contribuições são bem-vindas! Abra uma issue ou pull request.

---

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no GitHub.

---

**Desenvolvido com ❤️ por NANDOBRTV**

*Última atualização: Versão 2.0.0 - Abril 2026*

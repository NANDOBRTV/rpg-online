const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 1. Configurações Iniciais
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// 2. Configuração do Banco de Dados SQLite
const db = new sqlite3.Database('./neon_grid.db', (err) => {
    if (err) console.error('Erro ao abrir banco:', err.message);
    console.log('Conectado ao banco de dados SQLite.');
});

// Criar tabela de jogadores se não existir
db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT,
    x REAL DEFAULT 400,
    y REAL DEFAULT 300,
    color TEXT
)`);

// 3. Middlewares e Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 4. Lógica de Comunicação Real-time (Socket.io)
let activePlayers = {};

io.on('connection', (socket) => {
    console.log(`[CONEXÃO] Novo dispositivo conectado: ${socket.id}`);

    // Quando o jogador entra no jogo via navegador
    socket.on('join_game', (data) => {
        const playerColor = data.color || '#' + Math.floor(Math.random()*16777215).toString(16);
        
        activePlayers[socket.id] = {
            id: socket.id,
            username: data.username || `Runner_${socket.id.substring(0, 4)}`,
            x: 400,
            y: 300,
            color: playerColor
        };

        // Salva/Atualiza no Banco de Dados
        db.run(`INSERT OR REPLACE INTO players (id, username, x, y, color) VALUES (?, ?, ?, ?, ?)`, 
            [socket.id, activePlayers[socket.id].username, 400, 300, playerColor]);

        // Envia o estado atual para o novo jogador e avisa os outros
        socket.emit('current_players', activePlayers);
        socket.broadcast.emit('new_player', activePlayers[socket.id]);
    });

    // Atualização de movimento vinda do navegador
    socket.on('player_movement', (movementData) => {
        if (activePlayers[socket.id]) {
            activePlayers[socket.id].x = movementData.x;
            activePlayers[socket.id].y = movementData.y;
            
            // Broadcast otimizado para todos os outros
            socket.broadcast.emit('player_moved', activePlayers[socket.id]);
        }
    });

    // Tratamento de desconexão
    socket.on('disconnect', () => {
        console.log(`[DESCONEXÃO] Dispositivo saiu: ${socket.id}`);
        if (activePlayers[socket.id]) {
            // Persistir posição final antes de remover da memória
            db.run(`UPDATE players SET x = ?, y = ? WHERE id = ?`, 
                [activePlayers[socket.id].x, activePlayers[socket.id].y, socket.id]);
            
            delete activePlayers[socket.id];
            io.emit('player_disconnected', socket.id);
        }
    });
});

// 5. Inicialização do Servidor
server.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`SERVIDOR ONLINE: http://localhost:${PORT}`);
    console.log(`DEPLOY RENDER: Verifique o link do dashboard`);
    console.log(`-------------------------------------------`);
});

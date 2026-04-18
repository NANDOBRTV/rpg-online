const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Serve os arquivos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Banco de dados em memória para os jogadores ativos
let players = {};

io.on('connection', (socket) => {
    console.log('Conexão detectada:', socket.id);

    // Cria o registro do jogador assim que ele conecta
    players[socket.id] = {
        id: socket.id,
        x: 200, // Posição inicial X
        y: 200, // Posição inicial Y
        color: '#' + Math.floor(Math.random()*16777215).toString(16) // Cor aleatória
    };

    // Envia a lista de jogadores atualizada para todos (inclusive o que acabou de entrar)
    io.emit('update_players', players);

    // Escuta comandos de movimento vindos do navegador
    socket.on('player_movement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Re-transmite a posição para todos os conectados
            io.emit('update_players', players);
        }
    });

    // Remove o jogador quando ele fecha o navegador
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('update_players', players);
    });
});

// Porta dinâmica para o Render ou 3000 para local
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Servidor Ativo na porta ${PORT}`);
});

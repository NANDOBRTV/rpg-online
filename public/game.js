const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io(); // Conecta automaticamente ao seu servidor Render

// Referências da UI
const statusText = document.getElementById('status-text');
const pingText = document.getElementById('ping');
const logs = document.getElementById('logs');

let players = {};
let myId = null;

// 1. CONFIGURAÇÃO DO CANVAS
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 2. LÓGICA DE CONEXÃO
socket.on('connect', () => {
    statusText.innerText = "ONLINE";
    statusText.style.color = "#00f2ff";
    myId = socket.id;
    logs.innerHTML = `> LINK ESTABLISHED: ${myId.substring(0,8)}`;
    
    // Entrar no jogo
    socket.emit('join_game', { username: "Runner_" + myId.substring(0,4) });
});

socket.on('disconnect', () => {
    statusText.innerText = "OFFLINE";
    statusText.style.color = "#ff0055";
});

// Receber dados dos jogadores
socket.on('update_players', (serverPlayers) => {
    players = serverPlayers;
});

// Medir Latência (Ping)
setInterval(() => {
    const start = Date.now();
    socket.emit('ping', () => {
        const duration = Date.now() - start;
        pingText.innerText = duration;
    });
}, 2000);

// 3. ENTRADA DE MOVIMENTO (Toque/Clique)
canvas.addEventListener('mousedown', (e) => {
    if (!myId) return;
    
    // Envia a nova posição para o servidor
    socket.emit('player_movement', {
        x: e.clientX,
        y: e.clientY
    });
    
    logs.innerHTML = `> MOVING TO: ${e.clientX}, ${e.clientY}`;
});

// 4. LOOP DE RENDERIZAÇÃO (O DESENHO)
function draw() {
    // Limpa a tela com um rastro leve (efeito motion blur)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha o Grid de fundo
    ctx.strokeStyle = '#002222';
    ctx.lineWidth = 1;
    for(let x=0; x<canvas.width; x+=50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Desenha os jogadores
    for (let id in players) {
        const p = players[id];
        
        // Efeito de brilho neon
        ctx.shadowBlur = 15;
        ctx.shadowColor = (id === myId) ? '#ff00ff' : '#00f2ff';
        
        ctx.fillStyle = (id === myId) ? '#ff00ff' : '#00f2ff';
        
        // Desenha um triângulo tecnológico para o player
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 15);
        ctx.lineTo(p.x - 15, p.y + 15);
        ctx.lineTo(p.x + 15, p.y + 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0; // Reseta brilho para o próximo objeto
    }

    requestAnimationFrame(draw);
}

draw();

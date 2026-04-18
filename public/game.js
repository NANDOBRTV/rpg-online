const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajusta o canvas para ocupar a tela cheia
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let myId = null;
let gameState = { players: {}, bullets: [], enemies: [], xpOrbs: [] };
let mousePos = { x: 0, y: 0 };
let camX = 0;
let camY = 0;

// Inputs do Jogador
const keys = {};
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;
window.onmousemove = (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
};

// Tiro ao clicar
window.onmousedown = () => {
    const me = gameState.players[socket.id];
    if (me && !me.dead) {
        // Calcula direção baseada na posição da tela (não do mundo)
        const dx = mousePos.x - canvas.width / 2;
        const dy = mousePos.y - canvas.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        socket.emit('shoot', { x: me.x, y: me.y, vX: dx / dist, vY: dy / dist });
    }
};

socket.on('connect', () => { myId = socket.id; });

socket.on('update_world', (data) => {
    gameState = data;
});

socket.on('game_over', () => {
    alert("Você morreu! Clique para renascer.");
    socket.emit('respawn_request');
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const me = gameState.players[myId];

    if (me) {
        // Lógica de Movimento (Envio para o servidor)
        let mvX = me.x;
        let mvY = me.y;
        const speed = 5;
        if (keys['w'] || keys['arrowup']) mvY -= speed;
        if (keys['s'] || keys['arrowdown']) mvY += speed;
        if (keys['a'] || keys['arrowleft']) mvX -= speed;
        if (keys['d'] || keys['arrowright']) mvX += speed;
        
        socket.emit('player_movement', { x: mvX, y: mvY });

        // Interpolação da Câmera para suavizar
        camX += (me.x - camX) * 0.1;
        camY += (me.y - camY) * 0.1;
    }

    // --- RENDERIZAÇÃO ---
    const offsetX = canvas.width / 2 - camX;
    const offsetY = canvas.height / 2 - camY;

    // Desenhar Fundo (Grid para dar sensação de movimento)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = -5000; x <= 5000; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX, -5000 + offsetY);
        ctx.lineTo(x + offsetX, 5000 + offsetY);
        ctx.stroke();
    }
    for (let y = -5000; y <= 5000; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-5000 + offsetX, y + offsetY);
        ctx.lineTo(5000 + offsetX, y + offsetY);
        ctx.stroke();
    }

    // Desenhar Orbs de XP
    gameState.xpOrbs.forEach(orb => {
        ctx.fillStyle = '#ffdf00';
        ctx.beginPath();
        ctx.arc(orb.x + offsetX, orb.y + offsetY, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar Inimigos
    gameState.enemies.forEach(en => {
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x + offsetX - 20, en.y + offsetY - 20, 40, 40);
        // Barra de Vida Inimigo
        ctx.fillStyle = 'red';
        ctx.fillRect(en.x + offsetX - 20, en.y + offsetY - 30, 40, 5);
        ctx.fillStyle = 'lime';
        ctx.fillRect(en.x + offsetX - 20, en.y + offsetY - 30, (en.health / en.maxHealth) * 40, 5);
    });

    // Desenhar Balas
    gameState.bullets.forEach(b => {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(b.x + offsetX, b.y + offsetY, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar Outros Jogadores
    for (let id in gameState.players) {
        const p = gameState.players[id];
        if (p.dead) continue;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Nome e Nível
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv. ${p.level}`, p.x + offsetX, p.y + offsetY - 40);
        
        // Barra de Vida
        ctx.fillStyle = '#444';
        ctx.fillRect(p.x + offsetX - 25, p.y + offsetY + 35, 50, 6);
        ctx.fillStyle = 'lime';
        ctx.fillRect(p.x + offsetX - 25, p.y + offsetY + 35, (p.health / p.maxHealth) * 50, 6);
    }

    // Interface (UI Fixa na tela)
    if (me) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`XP: ${me.xp} / ${me.nextLevelXp}`, 20, 30);
        ctx.fillText(`Level: ${me.level}`, 20, 60);
        ctx.fillText(`Pos: ${Math.round(me.x)}, ${Math.round(me.y)}`, 20, 90);
    }

    requestAnimationFrame(draw);
}

draw();

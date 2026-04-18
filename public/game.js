const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('status');
const socket = io();

let players = {};
let myId = null;

// Configurações do Joystick
const joystick = {
    active: false,
    baseX: 100,
    baseY: 0,
    currX: 100,
    currY: 0,
    size: 50,
    maxLimit: 40
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joystick.baseY = canvas.height - 100; // Posiciona no canto inferior
    joystick.currY = joystick.baseY;
}
window.addEventListener('resize', resize);
resize();

socket.on('connect', () => {
    myId = socket.id;
    statusDisplay.innerText = "ONLINE";
});

socket.on('update_players', (serverPlayers) => {
    players = serverPlayers;
});

// LÓGICA DO JOYSTICK (TOQUE)
canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    // Só ativa se tocar no lado esquerdo da tela
    if (t.clientX < canvas.width / 2) {
        joystick.active = true;
        joystick.baseX = t.clientX;
        joystick.baseY = t.clientY;
        joystick.currX = t.clientX;
        joystick.currY = t.clientY;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!joystick.active) return;
    e.preventDefault();
    const t = e.touches[0];

    // Calcula a distância do centro
    let dx = t.clientX - joystick.baseX;
    let dy = t.clientY - joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Limita o movimento do analógico
    if (dist > joystick.maxLimit) {
        dx = (dx / dist) * joystick.maxLimit;
        dy = (dy / dist) * joystick.maxLimit;
    }

    joystick.currX = joystick.baseX + dx;
    joystick.currY = joystick.baseY + dy;

    // Move o jogador continuamente na direção do joystick
    if (players[myId]) {
        const speed = 5;
        socket.emit('player_movement', {
            x: players[myId].x + (dx / joystick.maxLimit) * speed,
            y: players[myId].y + (dy / joystick.maxLimit) * speed
        });
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joystick.active = false;
});

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha Joystick se estiver ativo
    if (joystick.active) {
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joystick.baseX, joystick.baseY, joystick.size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 242, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(joystick.currX, joystick.currY, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    // Desenha Jogadores
    for (let id in players) {
        const p = players[id];
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;

        // Desenha o Avatar
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();

        if (id === myId) {
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    }
    requestAnimationFrame(draw);
}
draw();

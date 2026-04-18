const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('status');
const debugDisplay = document.getElementById('debug');
const socket = io();

let players = {};
let myId = null;

// CONFIGURAÇÕES DO JOYSTICK FIXO
const joy = {
    active: false,
    baseX: 100, // Posição X fixa (distância da esquerda)
    baseY: 0,   // Será definida no resize (distância do fundo)
    currX: 100,
    currY: 0,
    size: 80,   // Aumentado para facilitar o toque
    limit: 70,  // Área de movimento do manche aumentada
    vx: 0,
    vy: 0
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Fixa o joystick 100px acima do final da tela
    joy.baseY = canvas.height - 120;
    joy.currX = joy.baseX;
    joy.currY = joy.baseY;
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

// LÓGICA DE TOQUE PARA JOYSTICK FIXO
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    
    // Verifica se o toque foi na área do joystick fixo (com uma margem de erro)
    const dist = Math.sqrt(Math.pow(t.clientX - joy.baseX, 2) + Math.pow(t.clientY - joy.baseY, 2));
    
    if (dist < joy.size + 50) {
        joy.active = true;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!joy.active) return;
    e.preventDefault();
    const t = e.touches[0];

    let dx = t.clientX - joy.baseX;
    let dy = t.clientY - joy.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > joy.limit) {
        dx = (dx / dist) * joy.limit;
        dy = (dy / dist) * joy.limit;
    }

    joy.currX = joy.baseX + dx;
    joy.currY = joy.baseY + dy;

    joy.vx = dx / joy.limit;
    joy.vy = dy / joy.limit;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joy.active = false;
    joy.currX = joy.baseX;
    joy.currY = joy.baseY;
    joy.vx = 0;
    joy.vy = 0;
});

// LOOP DE MOVIMENTO (VELOCIDADE AUMENTADA)
setInterval(() => {
    if (myId && players[myId] && (joy.vx !== 0 || joy.vy !== 0)) {
        const speed = 12; // Aumentado de 7 para 12 para ser mais rápido
        const newX = players[myId].x + joy.vx * speed;
        const newY = players[myId].y + joy.vy * speed;

        socket.emit('player_movement', { x: newX, y: newY });
    }
}, 20); // Intervalo menor para maior fluidez

// MOTOR DE DESENHO
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid de Fundo
    ctx.strokeStyle = '#111';
    for(let x=0; x<canvas.width; x+=50) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=50) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }

    // DESENHAR JOYSTICK FIXO
    // Base externa (aro)
    ctx.beginPath();
    ctx.arc(joy.baseX, joy.baseY, joy.size, 0, Math.PI*2);
    ctx.strokeStyle = joy.active ? '#00f2ff' : '#004444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Manche (parte móvel)
    ctx.beginPath();
    ctx.arc(joy.currX, joy.currY, 35, 0, Math.PI*2);
    ctx.fillStyle = joy.active ? 'rgba(0, 242, 255, 0.5)' : 'rgba(0, 242, 255, 0.2)';
    ctx.fill();

    // Desenhar Jogadores
    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI*2);
        ctx.fill();

        if (id === myId) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
}
draw();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// 1. CARREGAMENTO DO GATO
const imgGato = new Image();
imgGato.src = 'actor/animal/cat/SpriteSheet.png'; 
let gatoCarregado = false;
imgGato.onload = () => { gatoCarregado = true; };

let players = {};
let myId = null;

// 2. CONFIGURAÇÃO DO JOYSTICK VISUAL
const joy = { 
    active: false, 
    baseX: 100, 
    baseY: 0, 
    currX: 100, 
    currY: 0, 
    vx: 0, 
    vy: 0 
};

socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// 3. CONTROLES DE TOQUE MELHORADOS
canvas.addEventListener('touchstart', (e) => {
    let t = e.touches[0];
    if (t.clientX < canvas.width / 2) { // Só ativa se tocar no lado esquerdo
        joy.active = true;
        joy.baseX = t.clientX;
        joy.baseY = t.clientY;
        joy.currX = t.clientX;
        joy.currY = t.clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joy.active) return;
    
    let t = e.touches[0];
    let dx = t.clientX - joy.baseX;
    let dy = t.clientY - joy.baseY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    // Limita o movimento da bola do joystick
    if (dist > 50) {
        dx = (dx / dist) * 50;
        dy = (dy / dist) * 50;
    }
    
    joy.currX = joy.baseX + dx;
    joy.currY = joy.baseY + dy;
    
    // Velocidade que enviamos para o servidor
    joy.vx = dx / 50;
    joy.vy = dy / 50;

    if (myId && players[myId]) {
        socket.emit('player_movement', { 
            x: players[myId].x + joy.vx * 15, 
            y: players[myId].y + joy.vy * 15 
        });
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    joy.active = false;
    joy.vx = 0;
    joy.vy = 0;
});

// 4. DESENHO DO JOGO
function desenhar() {
    ctx.fillStyle = '#2d8a45'; // Grama
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        const me = players[myId];
        const camX = me.x - canvas.width / 2;
        const camY = me.y - canvas.height / 2;

        ctx.save();
        ctx.translate(-camX, -camY);

        for (let id in players) {
            let p = players[id];
            if (gatoCarregado) {
                ctx.drawImage(imgGato, 0, 0, 16, 16, p.x - 32, p.y - 32, 64, 64);
            }
        }
        ctx.restore();

        // DESENHAR O JOYSTICK NA TELA PARA VOCÊ VER
        if (joy.active) {
            ctx.beginPath(); // Base
            ctx.arc(joy.baseX, joy.baseY, 50, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.stroke();

            ctx.beginPath(); // Alavanca
            ctx.arc(joy.currX, joy.currY, 25, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fill();
        }
    }
    requestAnimationFrame(desenhar);
}

function ajustar() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joy.baseY = canvas.height - 150; // Posiciona o joystick no canto inferior
}
window.addEventListener('resize', ajustar);
ajustar();
desenhar();

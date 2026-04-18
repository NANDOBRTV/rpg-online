const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('status');
const debugDisplay = document.getElementById('debug');
const socket = io();

let players = {};
let myId = null;

// 1. AJUSTE DINÂMICO DE TELA (Mobile Responsiveness)
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 2. CONEXÃO COM O SERVIDOR RENDER
socket.on('connect', () => {
    myId = socket.id;
    statusDisplay.innerText = "ONLINE";
    statusDisplay.style.color = "#00f2ff";
});

socket.on('update_players', (serverPlayers) => {
    players = serverPlayers;
});

// 3. CONTROLE TOUCH (Otimizado para Mobile)
function handleInput(e) {
    // Impede que o navegador arraste a página para baixo enquanto você joga
    if (e.type === 'touchstart') e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Envia a coordenada do toque para o servidor
    socket.emit('player_movement', { x: clientX, y: clientY });
    
    // Atualiza o HUD no topo
    debugDisplay.innerText = `X:${Math.round(clientX)} Y:${Math.round(clientY)}`;
}

// Escuta tanto clique quanto toque físico na tela do celular
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });
canvas.addEventListener('touchmove', handleInput, { passive: false });

// 4. MOTOR DE RENDERIZAÇÃO
function draw() {
    // Fundo Preto com rastro (Motion Blur)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha o Grid de Fundo (Estilo Tron)
    ctx.strokeStyle = '#001a1a';
    ctx.lineWidth = 1;
    for(let x=0; x<canvas.width; x+=40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Desenha os Jogadores
    for (let id in players) {
        const p = players[id];
        
        // Efeito de Brilho Neon
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;

        // Se for o SEU personagem, ele terá uma borda branca para destaque
        if (id === myId) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Desenha um Losango Tecnológico
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 18);
        ctx.lineTo(p.x + 18, p.y);
        ctx.lineTo(p.x, p.y + 18);
        ctx.lineTo(p.x - 18, p.y);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0; // Limpa o brilho para o próximo
    }

    requestAnimationFrame(draw);
}

// Inicia o loop do jogo
draw();

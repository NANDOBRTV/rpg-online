const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

// 1. CAMINHO EXATO DA IMAGEM DO SEU PRINT
const imgGato = new Image();
imgGato.src = 'actor/animal/cat/SpriteSheet.png'; 

let gatoCarregado = false;
imgGato.onload = () => { gatoCarregado = true; };

let myId = null;
let players = {};

// Conectar ao servidor
socket.on('connect', () => { myId = socket.id; });
socket.on('update_world', (data) => { players = data.players; });

// 2. CONTROLES DE TOQUE (JOYSTICK INVISÍVEL)
let moveX = 0;
let moveY = 0;

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let touch = e.touches[0];
    // Se tocar no lado esquerdo, move o personagem
    if (touch.clientX < canvas.width / 2) {
        moveX = (touch.clientX - (canvas.width / 4)) / 50;
        moveY = (touch.clientY - (canvas.height / 2)) / 50;
        socket.emit('player_movement', { 
            x: players[myId].x + moveX * 10, 
            y: players[myId].y + moveY * 10 
        });
    }
}, { passive: false });

// 3. FUNÇÃO DE DESENHO
function desenhar() {
    // Fundo Verde (Cor base da paleta)
    ctx.fillStyle = '#32a852'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (myId && players[myId]) {
        const me = players[myId];
        
        // Câmera segue o Gato
        const camX = me.x - canvas.width / 2;
        const camY = me.y - canvas.height / 2;

        ctx.save();
        ctx.translate(-camX, -camY);

        for (let id in players) {
            let p = players[id];
            
            if (gatoCarregado) {
                // Desenha o gatinho recortando o SpriteSheet
                ctx.drawImage(imgGato, 0, 0, 16, 16, p.x - 32, p.y - 32, 64, 64);
            } else {
                // Se a imagem falhar, desenha um bloco branco
                ctx.fillStyle = 'white';
                ctx.fillRect(p.x - 20, p.y - 20, 40, 40);
            }
        }
        ctx.restore();
    }
    requestAnimationFrame(desenhar);
}

// Ajustar tamanho da tela
function ajustar() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', ajustar);
ajustar();

desenhar();

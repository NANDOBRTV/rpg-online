const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da Interface
const loginScreen = document.getElementById('login-screen');
const gameUI = document.getElementById('game-ui');
const menuModal = document.getElementById('main-menu-modal');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let me = null, players = {}, enemies = [], worldTime = 0, currentRoom = 'vila';
let selectedClass = 'ninja';
const camera = { x: 0, y: 0 };

// Efeitos visuais
const particles = [];
const floatingTexts = [];

// ========== CONFIGURAÇÃO E LOGIN ==========

function resize() { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
}
window.onresize = resize; 
resize();

document.querySelectorAll('.class-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedClass = btn.dataset.class;
    };
});

document.getElementById('btn-login').onclick = () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user && pass) {
        socket.emit('login', { user, pass, charClass: selectedClass });
    }
};

document.getElementById('btn-register').onclick = () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user && pass) {
        socket.emit('register', { user, pass, charClass: selectedClass });
    }
};

socket.on('msg', m => {
    document.getElementById('auth-msg').innerText = m;
});

socket.on('loginSuccess', () => {
    loginScreen.style.display = 'none';
    gameUI.style.display = 'block';
    addChatMessage('🎮 SISTEMA', 'Bem-vindo ao Herdeiro do Vento!', '#95a5a6');
});

// ========== SISTEMA DE MENUS E GESTÃO ==========

document.getElementById('btn-open-menu').onclick = () => { 
    menuModal.style.display = 'flex'; 
    updateMenuUI(); 
};

document.getElementById('btn-close-menu').onclick = () => { 
    menuModal.style.display = 'none'; 
};

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).style.display = 'block';
        updateMenuUI();
    };
});

function updateMenuUI() {
    if (!me) return;

    // Atributos
    document.getElementById('stat-str').innerText = me.stats.str;
    document.getElementById('stat-agi').innerText = me.stats.agi;
    document.getElementById('stat-int').innerText = me.stats.int;
    document.getElementById('stat-vit').innerText = me.stats.vit;
    document.getElementById('stat-points').innerText = me.statPoints;

    // Inventário
    const invGrid = document.getElementById('inventory-slots');
    invGrid.innerHTML = '';
    if (me.inventory && me.inventory.length > 0) {
        me.inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = `slot ${item.rarity || 'comum'}`;
            slot.innerHTML = `<div style="font-size:10px; text-align:center;">
                <div>${item.item_name}</div>
                <div style="color:#f1c40f; font-size:8px;">${item.rarity}</div>
            </div>`;
            slot.title = `${item.item_name} (${item.rarity})`;
            invGrid.appendChild(slot);
        });
    }
    
    // Preencher slots vazios
    const totalSlots = 20;
    for (let i = me.inventory?.length || 0; i < totalSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        invGrid.appendChild(slot);
    }

    // Skills
    const skillTree = document.getElementById('skill-tree');
    if (me.skills && me.skills.length > 0) {
        skillTree.innerHTML = me.skills.map(s => `
            <div class="stats-list">
                <p>${s.skill_name} <button class="plus-btn" style="width:auto; padding:5px 10px;">USAR</button></p>
            </div>
        `).join('');
    } else {
        skillTree.innerHTML = '<p style="color:#999;">Nenhuma habilidade desbloqueada ainda</p>';
    }

    // Missões
    const questList = document.getElementById('quest-list');
    if (!me.quests || me.quests.length === 0) {
        questList.innerHTML = `
            <div style="background:#2f3640; padding:15px; border-radius:8px; text-align:center;">
                <p style="margin-bottom:10px;">Nenhuma missão ativa</p>
                <button class="plus-btn" style="width:100%" onclick="socket.emit('acceptQuest', 'kill_slimes')">
                    ACEITAR PRIMEIRA MISSÃO
                </button>
            </div>
        `;
    } else {
        questList.innerHTML = me.quests.map(q => `
            <div style="background:#2f3640; padding:12px; border-radius:8px; margin-bottom:8px; border-left:4px solid #3498db;">
                <b style="color:#3498db;">${q.title}</b><br>
                <div style="margin-top:8px; background:#1a1f26; padding:6px; border-radius:4px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span>Progresso: ${q.current_progress}/${q.goal}</span>
                        <span style="color:#f1c40f;">${Math.round((q.current_progress/q.goal)*100)}%</span>
                    </div>
                    <div style="width:100%; height:8px; background:#333; border-radius:4px; margin-top:4px; overflow:hidden;">
                        <div style="width:${(q.current_progress/q.goal)*100}%; height:100%; background:linear-gradient(90deg, #2ecc71, #27ae60);"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Codex (Bestiário)
    const bestiary = document.getElementById('bestiary-list');
    if (me.bestiary && me.bestiary.length > 0) {
        bestiary.innerHTML = me.bestiary.map(b => `
            <p style="padding:8px; border-bottom:1px solid #444; display:flex; justify-content:space-between;">
                <span>${b.enemy_name}</span>
                <span style="color:#f1c40f; font-weight:bold;">${b.kills} derrotados</span>
            </p>
        `).join('');
    } else {
        bestiary.innerHTML = '<p style="color:#999;">Derrote inimigos para desbloquear o bestiário</p>';
    }
}

document.querySelectorAll('.plus-btn').forEach(btn => {
    btn.onclick = (e) => { 
        if(btn.dataset.stat) socket.emit('addStat', btn.dataset.stat); 
    };
});

socket.on('updateUI', () => { updateMenuUI(); });

// ========== SISTEMA DE CHAT ==========

function addChatMessage(name, msg, color) {
    const div = document.createElement('div');
    div.style.marginBottom = '5px';
    div.innerHTML = `<span style="color:${color}"><b>${name}:</b></span> ${msg}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Limitar a 50 mensagens
    while (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

document.getElementById('btn-send-chat').onclick = () => {
    const msg = chatInput.value.trim();
    if (msg) { 
        socket.emit('chat', msg); 
        chatInput.value = ''; 
        chatInput.blur(); 
    }
};

socket.on('newChat', d => {
    addChatMessage(d.name, d.msg, d.color);
});

// ========== CONTROLES MOBILE ==========

const inputState = { vx: 0, jump: false, attack: false };

function sendInput() { 
    socket.emit('input', inputState); 
}

function setupBtn(id, action, valOn, valOff) {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    const start = (e) => { 
        e.preventDefault(); 
        if (action === 'vx') inputState.vx = valOn; 
        else inputState[action] = valOn; 
        sendInput(); 
    };
    
    const end = (e) => { 
        e.preventDefault(); 
        if (action === 'vx') inputState.vx = 0; 
        else inputState[action] = valOff; 
        sendInput(); 
    };
    
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
}

setupBtn('btn-left', 'vx', -1, 0);
setupBtn('btn-right', 'vx', 1, 0);
setupBtn('btn-jump', 'jump', true, false);
setupBtn('btn-attack', 'attack', true, false);

// Suporte a teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') inputState.vx = -1;
    if (e.key === 'ArrowRight' || e.key === 'd') inputState.vx = 1;
    if (e.key === ' ') inputState.jump = true;
    if (e.key === 'Enter') document.getElementById('btn-send-chat').click();
    sendInput();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') inputState.vx = 0;
    if (e.key === ' ') inputState.jump = false;
    sendInput();
});

// ========== SISTEMA DE PARTÍCULAS ==========

class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
    }

    draw(ctx, offsetX) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - offsetX, this.y, 4, 4);
        ctx.globalAlpha = 1;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60;
        this.maxLife = 60;
    }

    update() {
        this.y -= 1;
        this.life--;
    }

    draw(ctx, offsetX) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x - offsetX, this.y);
        ctx.globalAlpha = 1;
    }
}

function createDamageEffect(x, y, damage) {
    floatingTexts.push(new FloatingText(x, y, `-${Math.round(damage)}`, '#e74c3c'));
    
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const vx = Math.cos(angle) * 2;
        const vy = Math.sin(angle) * 2 - 1;
        particles.push(new Particle(x, y, vx, vy, '#e74c3c', 30));
    }
}

// ========== GAME LOOP ==========

socket.on('world', s => {
    players = s.players; 
    enemies = s.enemies; 
    worldTime = s.worldTime;
    me = players[socket.id];
    
    if (me) {
        currentRoom = me.room;
        document.getElementById('hp-fill').style.width = (me.hp / me.maxHp) * 100 + "%";
        document.getElementById('hp-text').innerText = `${Math.ceil(me.hp)}/${me.maxHp}`;
        document.getElementById('player-gold').innerText = `${me.gold}`;
    }
});

function getRoomBackground() {
    const night = worldTime < 600 || worldTime > 1800;
    
    const backgrounds = {
        vila: night ? "#0a121e" : "#3498db",
        floresta: night ? "#051405" : "#2ecc71",
        caverna_sombria: "#1a1a2e"
    };
    
    return backgrounds[currentRoom] || "#000";
}

function drawEnvironment() {
    // Céu
    ctx.fillStyle = getRoomBackground();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Nuvens (apenas em vila e floresta)
    if (currentRoom !== 'caverna_sombria') {
        const cloudX = (worldTime * 0.5) % (canvas.width + 200);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(cloudX, 100, 40, 0, Math.PI * 2);
        ctx.arc(cloudX + 50, 90, 50, 0, Math.PI * 2);
        ctx.arc(cloudX + 100, 100, 40, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Chão
    ctx.fillStyle = currentRoom === 'caverna_sombria' ? "#0d0d0d" : "#1e272e";
    ctx.fillRect(-2000, 420, 5000, 600);
    
    // Decoração do chão
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = -2000; i < 3500; i += 200) {
        ctx.beginPath();
        ctx.moveTo(i, 420);
        ctx.lineTo(i + 100, 420);
        ctx.stroke();
    }
}

function draw() {
    if (!me) {
        requestAnimationFrame(draw);
        return;
    }

    drawEnvironment();

    // Câmera
    camera.x += (me.x - canvas.width / 2 - camera.x) * 0.1;
    ctx.save();
    ctx.translate(-camera.x, 0);
    
    // Desenhar inimigos
    enemies.forEach(e => {
        // Barra de HP do inimigo
        const hpBarWidth = 40;
        const hpBarHeight = 6;
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x - hpBarWidth/2, e.y - 50, hpBarWidth, hpBarHeight);
        
        const hpPercent = e.hp / e.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(e.x - hpBarWidth/2, e.y - 50, hpBarWidth * hpPercent, hpBarHeight);
        
        // Corpo do inimigo
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - 20, e.y - 40, 40, 40);
        
        // Brilho para bosses
        if (e.isBoss) {
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 2;
            ctx.strokeRect(e.x - 22, e.y - 42, 44, 44);
        }
        
        // Nome do inimigo
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(e.name, e.x, e.y - 55);
    });

    // Desenhar jogadores
    for (let id in players) {
        let p = players[id];
        if (p.dead) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.fillRect(p.x - 20, p.y - 40, 40, 40);
            ctx.fillStyle = '#999';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('MORTO', p.x, p.y - 50);
        } else {
            // Barra de HP
            const hpBarWidth = 50;
            const hpBarHeight = 5;
            ctx.fillStyle = '#333';
            ctx.fillRect(p.x - hpBarWidth/2, p.y - 50, hpBarWidth, hpBarHeight);
            
            const hpPercent = p.hp / p.maxHp;
            ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(p.x - hpBarWidth/2, p.y - 50, hpBarWidth * hpPercent, hpBarHeight);
            
            // Corpo do jogador
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 20, p.y - 40, 40, 40);
            
            // Destaque do jogador atual
            if (id === socket.id) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(p.x - 22, p.y - 42, 44, 44);
            }
            
            // Nome e nível
            ctx.fillStyle = p.color;
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${p.name}`, p.x, p.y - 55);
            
            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(`[Lvl ${p.level}]`, p.x, p.y - 42);
        }
    }

    // Desenhar partículas
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw(ctx, camera.x);
    });

    // Desenhar textos flutuantes
    floatingTexts = floatingTexts.filter(t => t.life > 0);
    floatingTexts.forEach(t => {
        t.update();
        t.draw(ctx, camera.x);
    });

    ctx.restore();
    
    requestAnimationFrame(draw);
}

draw();

// ========== INICIALIZAÇÃO ==========

console.log('🎮 Herdeiro do Vento - Cliente carregado');
console.log('Versão: 2.0 - Melhorias Completas');

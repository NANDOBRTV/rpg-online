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

// --- CONFIGURAÇÃO E LOGIN ---
function resize() { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
}
window.onresize = resize; resize();

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
    if (user && pass) socket.emit('login', { user, pass, charClass: selectedClass });
};

document.getElementById('btn-register').onclick = () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user && pass) socket.emit('register', { user, pass });
};

socket.on('msg', m => document.getElementById('auth-msg').innerText = m);

socket.on('loginSuccess', () => {
    loginScreen.style.display = 'none';
    gameUI.style.display = 'block';
});

// --- SISTEMA DE MENUS E GESTÃO ---
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
    for (let i = 0; i < 20; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        if (me.inventory && me.inventory[i]) slot.innerText = me.inventory[i].name;
        invGrid.appendChild(slot);
    }

    // Skills
    const skillTree = document.getElementById('skill-tree');
    skillTree.innerHTML = me.skills.map(s => `
        <div class="stats-list"><p>${s} <button class="plus-btn">USAR</button></p></div>
    `).join('');

    // Missões
    const questList = document.getElementById('quest-list');
    if (!me.quests || me.quests.length === 0) {
        questList.innerHTML = `<button class="plus-btn" style="width:100%" onclick="socket.emit('acceptQuest')">ACEITAR MISSÃO INICIAL</button>`;
    } else {
        questList.innerHTML = me.quests.map(q => `
            <div style="background:#2f3640; padding:10px; border-radius:5px; margin-bottom:5px">
                <b>${q.title}</b><br>Progresso: ${q.current}/${q.goal}
            </div>
        `).join('');
    }

    // Codex (Bestiário)
    const bestiary = document.getElementById('bestiary-list');
    if (me.codex) {
        bestiary.innerHTML = Object.entries(me.codex).map(([name, count]) => `
            <p style="padding:5px; border-bottom:1px solid #444">${name}: ${count} derrotados</p>
        `).join('');
    }
}

document.querySelectorAll('.plus-btn').forEach(btn => {
    btn.onclick = () => { if(btn.dataset.stat) socket.emit('addStat', btn.dataset.stat); };
});

socket.on('updateUI', () => { updateMenuUI(); });

// --- CONTROLES MOBILE ---
const inputState = { vx: 0, jump: false, attack: false };
function sendInput() { socket.emit('input', inputState); }

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
    btn.addEventListener('touchstart', start);
    btn.addEventListener('touchend', end);
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
}

setupBtn('btn-left', 'vx', -1, 0);
setupBtn('btn-right', 'vx', 1, 0);
setupBtn('btn-jump', 'jump', true, false);
setupBtn('btn-attack', 'attack', true, false);

// --- CHAT ---
document.getElementById('btn-send-chat').onclick = () => {
    const msg = chatInput.value.trim();
    if (msg) { socket.emit('chat', msg); chatInput.value = ''; chatInput.blur(); }
};
socket.on('newChat', d => {
    const div = document.createElement('div');
    div.innerHTML = `<span style="color:${d.color}"><b>${d.name}:</b></span> ${d.msg}`;
    chatMessages.appendChild(div); chatMessages.scrollTop = chatMessages.scrollHeight;
});

// --- GAME LOOP ---
socket.on('world', s => {
    players = s.players; 
    enemies = s.enemies; 
    worldTime = s.worldTime;
    me = players[socket.id];
    if (me) {
        currentRoom = me.room;
        document.getElementById('hp-fill').style.width = (me.hp / me.maxHp) * 100 + "%";
        document.getElementById('hp-text').innerText = `${Math.ceil(me.hp)}/${me.maxHp}`;
        document.getElementById('player-gold').innerText = `${me.gold}g`;
    }
});

function draw() {
    const night = worldTime < 600 || worldTime > 1800;
    ctx.fillStyle = currentRoom === 'vila' ? (night ? "#0a121e" : "#3498db") : (night ? "#051405" : "#2ecc71");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (me) {
        camera.x += (me.x - canvas.width / 2 - camera.x) * 0.1;
        ctx.save();
        ctx.translate(-camera.x, 0);
        
        // Chão
        ctx.fillStyle = "#1e272e";
        ctx.fillRect(-2000, 420, 5000, 600);

        // Inimigos
        enemies.forEach(e => {
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(e.x - 20, e.y - 40, 40, 40);
        });

        // Jogadores
        for (let id in players) {
            let p = players[id];
            if (p.dead) continue;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 20, p.y - 40, 40, 40);
            ctx.fillStyle = "white";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${p.name} [Lvl ${p.level}]`, p.x, p.y - 50);
        }
        ctx.restore();
    }
    requestAnimationFrame(draw);
}
draw();
      

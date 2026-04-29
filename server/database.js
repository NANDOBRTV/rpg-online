const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'game.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) console.error('Erro ao conectar ao banco:', err);
            else console.log('✓ Banco de dados SQLite conectado');
        });
        this.initTables();
    }

    initTables() {
        this.db.serialize(() => {
            // Tabela de usuários
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    level INTEGER DEFAULT 1,
                    xp INTEGER DEFAULT 0,
                    gold INTEGER DEFAULT 100,
                    stats_str INTEGER DEFAULT 0,
                    stats_agi INTEGER DEFAULT 0,
                    stats_int INTEGER DEFAULT 0,
                    stats_vit INTEGER DEFAULT 0,
                    stat_points INTEGER DEFAULT 0,
                    class TEXT DEFAULT 'ninja',
                    last_map TEXT DEFAULT 'vila',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Tabela de inventário
            this.db.run(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    item_id TEXT NOT NULL,
                    item_name TEXT NOT NULL,
                    rarity TEXT DEFAULT 'comum',
                    quantity INTEGER DEFAULT 1,
                    stats_str INTEGER DEFAULT 0,
                    stats_agi INTEGER DEFAULT 0,
                    stats_int INTEGER DEFAULT 0,
                    stats_vit INTEGER DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            `);

            // Tabela de quests
            this.db.run(`
                CREATE TABLE IF NOT EXISTS quests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    quest_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    current_progress INTEGER DEFAULT 0,
                    goal INTEGER DEFAULT 1,
                    completed BOOLEAN DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            `);

            // Tabela de bestiário (codex)
            this.db.run(`
                CREATE TABLE IF NOT EXISTS bestiary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    enemy_name TEXT NOT NULL,
                    kills INTEGER DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            `);

            // Tabela de clãs/guildas
            this.db.run(`
                CREATE TABLE IF NOT EXISTS clans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clan_id TEXT UNIQUE NOT NULL,
                    clan_name TEXT NOT NULL,
                    leader_id INTEGER NOT NULL,
                    description TEXT,
                    level INTEGER DEFAULT 1,
                    treasury INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(leader_id) REFERENCES users(id)
                )
            `);

            // Tabela de membros de clãs
            this.db.run(`
                CREATE TABLE IF NOT EXISTS clan_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clan_id TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT DEFAULT 'membro',
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(clan_id) REFERENCES clans(clan_id)
                )
            `);

            // Tabela de habilidades desbloqueadas
            this.db.run(`
                CREATE TABLE IF NOT EXISTS skills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    skill_name TEXT NOT NULL,
                    level INTEGER DEFAULT 1,
                    unlocked BOOLEAN DEFAULT 1,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            `);
        });
    }

    // Métodos de usuário
    getUser(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createUser(username, hashedPassword, charClass) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (username, password, class) VALUES (?, ?, ?)',
                [username, hashedPassword, charClass],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    updateUser(userId, data) {
        const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.values(data);
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [...values, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Métodos de inventário
    addItem(userId, itemId, itemName, rarity, stats) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO inventory (user_id, item_id, item_name, rarity, stats_str, stats_agi, stats_int, stats_vit)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, itemId, itemName, rarity, stats.str || 0, stats.agi || 0, stats.int || 0, stats.vit || 0],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getInventory(userId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM inventory WHERE user_id = ?', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Métodos de quests
    addQuest(userId, questId, title, goal) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO quests (user_id, quest_id, title, goal) VALUES (?, ?, ?, ?)',
                [userId, questId, title, goal],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getQuests(userId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM quests WHERE user_id = ?', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    updateQuestProgress(userId, questId, progress) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE quests SET current_progress = ? WHERE user_id = ? AND quest_id = ?',
                [progress, userId, questId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Métodos de bestiário
    recordKill(userId, enemyName) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO bestiary (user_id, enemy_name, kills) VALUES (?, ?, 1)
                 ON CONFLICT(user_id, enemy_name) DO UPDATE SET kills = kills + 1`,
                [userId, enemyName],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getBestiary(userId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM bestiary WHERE user_id = ?', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Métodos de clãs
    createClan(clanId, clanName, leaderId, description) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO clans (clan_id, clan_name, leader_id, description) VALUES (?, ?, ?, ?)',
                [clanId, clanName, leaderId, description],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getClan(clanId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM clans WHERE clan_id = ?', [clanId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    addClanMember(clanId, userId, role = 'membro') {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, ?)',
                [clanId, userId, role],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getClanMembers(clanId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT u.id, u.username, u.level, cm.role FROM clan_members cm
                 JOIN users u ON cm.user_id = u.id WHERE cm.clan_id = ?`,
                [clanId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // Métodos de habilidades
    addSkill(userId, skillName, level = 1) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO skills (user_id, skill_name, level) VALUES (?, ?, ?)',
                [userId, skillName, level],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getSkills(userId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM skills WHERE user_id = ? AND unlocked = 1', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();

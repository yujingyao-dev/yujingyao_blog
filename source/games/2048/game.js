document.addEventListener('DOMContentLoaded', () => {
    
    // --- 音频管理器 ---
    const AudioMgr = {
        sounds: {},
        muted: false,

        init() {
            // 在这里定义你的文件路径
            const sources = {
                move: 'audio/move.mp3',      // 替换为你实际的文件路径
                merge: 'audio/merge.mp3',
                attack: 'audio/attack.mp3',
                hurt: 'audio/hurt.mp3',
                skill: 'audio/skill.mp3',
                levelup: 'audio/levelup.mp3',
                gameover: 'audio/gameover.mp3'
            };

            // 预加载
            for (let key in sources) {
                this.sounds[key] = new Audio(sources[key]);
                this.sounds[key].volume = 0.5; // 默认音量 50%
            }

            // 绑定静音按钮
            // 在 AudioMgr.init() 内部
            const btn = document.getElementById('mute-btn');
            const icon = document.getElementById('mute-icon'); // 如果你用了 span 包裹

            if(btn) {
                btn.addEventListener('click', () => {
                    this.muted = !this.muted;
                    
                    // 切换图标
                    if (icon) icon.innerText = this.muted ? '🔇' : '🔊'; 
                    // 或者不换图标，只变色，看你喜好
                    
                    // 切换样式类
                    btn.classList.toggle('muted', this.muted);
                });
            }
        },

        play(name) {
            if (this.muted || !this.sounds[name]) return;
            
            // 允许重叠播放（比如连续快速移动）
            // 做法是：克隆节点或者重置时间
            const sound = this.sounds[name];
            
            // 简单的重置时间法（适合短音效）
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Audio play blocked", e));
        }
    };


    // --- 配置 ---
    const CONFIG = {
        SIZE: 4,
        GRID_GAP: 15,
        CELL_SIZE: 71.25,
        COST_UNDO: 20,
        COST_PURGE: 50,
        MAX_ENERGY: 100,
        // 肉鸽模式参数
        BASE_PLAYER_HP: 100,
        BASE_ENEMY_HP: 128,
        ENEMY_HP_SCALE: 1.5, // 每关血量倍率
        ENEMY_ATTACK_RATE: 10, // 敌人每10步攻击一次
        ENEMY_DAMAGE: 15
    };

    // --- DOM 引用 ---
    const DOM = {
        board: document.getElementById('board'),
        tileContainer: document.getElementById('tile-container'),
        score: document.getElementById('score'),
        energyVal: document.getElementById('energy'),
        energyBar: document.getElementById('energy-bar'),
        overlay: document.getElementById('overlay'),
        overlayTitle: document.getElementById('overlay-title'),
        overlaySub: document.getElementById('overlay-sub'),
        retryBtn: document.getElementById('retry-btn'),
        btnUndo: document.getElementById('btn-undo'),
        btnPurge: document.getElementById('btn-purge'),
        // DLC 新增
        modeSwitch: document.getElementById('mode-switch'),
        subtitle: document.getElementById('game-subtitle'),
        statsClassic: document.getElementById('stats-classic'),
        statsRogue: document.getElementById('stats-rogue'),
        rogueLevel: document.getElementById('rogue-level'),
        enemyName: document.getElementById('enemy-name'),
        enemyHpBar: document.getElementById('enemy-hp-bar'),
        enemyHpText: document.getElementById('enemy-hp-text'),
        playerHpBar: document.getElementById('player-hp-bar'),
        playerHpText: document.getElementById('player-hp-text'),
        damageLayer: document.getElementById('damage-layer'),
        hint: document.getElementById('controls-hint'),
        monsterAvatar: document.getElementById('monster-avatar'),
    };

    // --- 游戏状态 ---
    let state = {
        board: [],
        score: 0,
        energy: 0,
        gameOver: false,
        uniqueId: 0,
        history: [],
        isTargeting: false,
        // DLC 状态
        isRoguelike: false,
        level: 1,
        playerHP: 100,
        maxPlayerHP: 100,
        enemyHP: 100,
        maxEnemyHP: 100,
        movesSinceAttack: 0
    };

    // --- 初始化 ---
    function init() {
        AudioMgr.init(); 
        DOM.retryBtn.addEventListener('click', resetGame);
        
        // 模式切换监听
        DOM.modeSwitch.addEventListener('change', (e) => {
            state.isRoguelike = e.target.checked;
            toggleModeUI();
            resetGame();
        });

        DOM.btnUndo.addEventListener('click', () => {
            if(checkEnergy(CONFIG.COST_UNDO) && state.history.length > 0) {
                AudioMgr.play('skill');
                applyUndo();
            }
        });
        
        DOM.btnPurge.addEventListener('click', () => {
            if(checkEnergy(CONFIG.COST_PURGE) && !state.isTargeting) enterTargetMode();
        });

        DOM.board.addEventListener('click', handleBoardClick);
        setupInputs();
        
        // 默认初始化
        toggleModeUI();
        resetGame();
    }

    // 切换 UI 显示
    function toggleModeUI() {
        if (state.isRoguelike) {
            DOM.subtitle.innerText = "BREACH PROTOCOL: ACTIVE";
            DOM.statsClassic.style.display = 'none';
            DOM.statsRogue.style.display = 'flex';
            DOM.hint.innerText = "Merge to Deal Damage • Survive the Counterattack";
            document.body.style.setProperty('--glow-color', '#ff0055'); // 改变主题色
        } else {
            DOM.subtitle.innerText = "CLASSIC EDITION";
            DOM.statsClassic.style.display = 'flex';
            DOM.statsRogue.style.display = 'none';
            DOM.hint.innerText = "Arrow Keys to Move • Skills to Survive";
            document.body.style.setProperty('--glow-color', '#00ff00');
        }
    }

    function resetGame() {
        state.board = Array(CONFIG.SIZE * CONFIG.SIZE).fill(null);
        state.score = 0;
        state.energy = 0;
        state.gameOver = false;
        state.uniqueId = 0;
        state.history = [];
        state.isTargeting = false;
        state.movesSinceAttack = 0;

        // 肉鸽初始化
        if (state.isRoguelike) {
            state.level = 1;
            state.playerHP = CONFIG.BASE_PLAYER_HP;
            state.maxPlayerHP = CONFIG.BASE_PLAYER_HP;
            initLevel(1);
        }

        DOM.overlay.classList.remove('active');
        DOM.board.classList.remove('targeting');
        DOM.damageLayer.innerHTML = '';
        updateUI();
        DOM.tileContainer.innerHTML = '';
        
        addRandomTile();
        addRandomTile();
        saveHistory();
    }

    // 初始化关卡敌人
    function initLevel(lvl) {
        state.level = lvl;
        // 敌人血量指数增长
        state.maxEnemyHP = Math.floor(CONFIG.BASE_ENEMY_HP * Math.pow(CONFIG.ENEMY_HP_SCALE, lvl - 1));
        state.enemyHP = state.maxEnemyHP;
        
        // 随机生成霸气的名字
        const prefixes = ["FIREWALL", "ICE", "DAEMON", "KERBEROS", "HYDRA"];
        const suffixes = ["v1.0", "BETA", "PRIME", "DESTROYER", "CORE"];
        const name = `${prefixes[Math.floor(Math.random()*prefixes.length)]} ${suffixes[Math.floor(Math.random()*suffixes.length)]}`;
        
        DOM.enemyName.innerText = `${name} (L${lvl})`;
        DOM.rogueLevel.innerText = lvl;
        updateBattleUI();
        
        // 关卡开始提示
        showFloatingText(DOM.board, `LEVEL ${lvl} START`, '#fff');
    }

    // --- 核心游戏循环修改 ---

    function move(direction) {
        if (state.isTargeting || state.gameOver) return;

        const vector = getVector(direction);
        const traversals = buildTraversals(vector);
        let moved = false;
        let hasMerge = false;
        let mergedIds = new Set();
        let energyGained = 0;
        let totalDamage = 0; // 本回合伤害

        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                const pos = y * CONFIG.SIZE + x;
                const tile = state.board[pos];
                if (tile) {
                    const positions = findFarthestPosition(pos, vector);
                    const nextPos = positions.next;
                    
                    if (nextPos >= 0 && nextPos < 16) {
                        const nextTile = state.board[nextPos];
                        if (nextTile && nextTile.value === tile.value && !mergedIds.has(nextPos)) {
                            const mergedVal = tile.value * 2;
                            const mergedTile = createTile(mergedVal);
                            hasMerge = true; 
                            mergedTile.mergedFrom = true;
                            state.board[nextPos] = mergedTile;
                            state.board[pos] = null;
                            mergedIds.add(nextPos);
                            
                            state.score += mergedVal;
                            energyGained += Math.max(2, Math.floor(Math.log2(mergedVal)));
                            
                            // 肉鸽：累计伤害
                            if (state.isRoguelike) {
                                totalDamage += mergedVal;
                            }
                            
                            moved = true;
                        } else {
                            moveTile(pos, positions.farthest);
                            if (pos !== positions.farthest) moved = true;
                        }
                    } else {
                         moveTile(pos, positions.farthest);
                         if (pos !== positions.farthest) moved = true;
                    }
                }
            });
        });

        if (moved) {
            updateEnergy(energyGained);
            saveHistory();
            triggerTilt(direction);
            // 播放音频
            if (state.isRoguelike && totalDamage > 0) {
                AudioMgr.play('attack'); // 肉鸽模式下，合并即攻击
            } 
            else if (hasMerge) {
                AudioMgr.play('merge');
            } 
            else {
                AudioMgr.play('move');
            }

            // 造成伤害
            if (state.isRoguelike && totalDamage > 0) {
                applyDamageToEnemy(totalDamage);
            }

            // 检查胜利 (敌人死亡)
            if (state.isRoguelike && state.enemyHP <= 0) {
                handleLevelComplete();
                return; // 关卡胜利后跳过生成新块和敌人攻击，等待重置
            }
            
            addRandomTile();
            updateUI();

            // 敌人反击逻辑
            if (state.isRoguelike) {
                handleEnemyTurn();
            }

            // 检查失败
            if (state.isRoguelike && state.playerHP <= 0) {
                triggerGameOver("SYSTEM INTEGRITY CRITICAL");
            } else if (!movesAvailable()) {
                if(state.energy < CONFIG.COST_PURGE) {
                    triggerGameOver("MEMORY OVERFLOW");
                }
            }
        }
    }

    // --- 肉鸽逻辑实现 ---

    function applyDamageToEnemy(dmg) {
        state.enemyHP -= dmg;
        if (state.enemyHP < 0) state.enemyHP = 0;
        
        // --- [新增] 怪物受击反馈 ---
        DOM.monsterAvatar.classList.remove('attack'); // 防止冲突
        DOM.monsterAvatar.classList.add('hurt');
    
        // 0.3秒后移除受击状态，恢复正常
        setTimeout(() => {
            DOM.monsterAvatar.classList.remove('hurt');
        }, 300);
        // 视觉效果
        showFloatingText(DOM.board, `-${dmg}`, '#ff0055');
        DOM.enemyHpBar.parentElement.classList.add('shake');
        setTimeout(() => DOM.enemyHpBar.parentElement.classList.remove('shake'), 300);
        
        updateBattleUI();
    }

    function handleEnemyTurn() {
    state.movesSinceAttack++;
    const movesUntilAttack = CONFIG.ENEMY_ATTACK_RATE - state.movesSinceAttack;
    
    // 这里可以加一个预警逻辑，比如眼睛变红
    if (movesUntilAttack <= 2) {
         DOM.monsterAvatar.style.borderColor = "#fff"; // 预警色
    } else {
         DOM.monsterAvatar.style.borderColor = "#ff0055"; // 恢复
    }
    
    if (state.movesSinceAttack >= CONFIG.ENEMY_ATTACK_RATE) {
        // --- [新增] 怪物攻击动作 ---
        DOM.monsterAvatar.classList.add('attack');
        AudioMgr.play('hurt');
        // 动作做完后结算伤害
        setTimeout(() => {
            const dmg = CONFIG.ENEMY_DAMAGE + (state.level * 2);
            state.playerHP -= dmg;
            state.movesSinceAttack = 0;
            
            showFloatingText(DOM.board, `WARNING: HIT -${dmg}`, '#ff0000');
            DOM.board.classList.add('shake');
            setTimeout(() => DOM.board.classList.remove('shake'), 300);
            
            // 恢复状态
            DOM.monsterAvatar.classList.remove('attack');
            DOM.monsterAvatar.style.borderColor = "#ff0055";
            updateBattleUI();
        }, 300); // 等待 CSS 动画的冲击时刻
    }
}

    function handleLevelComplete() {
    // [新增] 怪物死亡
    DOM.monsterAvatar.classList.add('dead');
    AudioMgr.play('levelup');
    setTimeout(() => {
        state.level++;
        // ... (奖励逻辑不变) ...
        // 奖励：回血 30%
        state.playerHP = Math.min(state.maxPlayerHP, state.playerHP + Math.floor(state.maxPlayerHP * 0.3));
        
        // 奖励：清除场上所有 2 和 4 (小清理)
        for(let i=0; i<16; i++) {
            if(state.board[i] && state.board[i].value <= 4) {
                state.board[i] = null;
            }
        }
        render();
        
        // [新增] 怪物重生 (移除 dead 类)
        DOM.monsterAvatar.classList.remove('dead');
        initLevel(state.level);
        
        saveHistory();
    }, 1000); // 延长时间以展示死亡动画
}

    // --- 通用 UI 和辅助 ---

    function updateUI() {
        DOM.score.innerText = state.score;
        DOM.energyVal.innerText = `${Math.floor(state.energy)}%`;
        DOM.energyBar.style.width = `${Math.min(100, state.energy)}%`;
        
        if (state.isRoguelike) updateBattleUI();

        // 按钮状态
        DOM.btnUndo.disabled = !(state.energy >= CONFIG.COST_UNDO && state.history.length > 1);
        if(!DOM.btnUndo.disabled) DOM.btnUndo.classList.add('active'); else DOM.btnUndo.classList.remove('active');

        DOM.btnPurge.disabled = !(state.energy >= CONFIG.COST_PURGE);
        if(!DOM.btnPurge.disabled) DOM.btnPurge.classList.add('active'); else DOM.btnPurge.classList.remove('active');
    }

    function updateBattleUI() {
        const enemyPct = (state.enemyHP / state.maxEnemyHP) * 100;
        const playerPct = (state.playerHP / state.maxPlayerHP) * 100;
        
        DOM.enemyHpBar.style.width = `${enemyPct}%`;
        DOM.enemyHpText.innerText = `${state.enemyHP}/${state.maxEnemyHP}`;
        
        DOM.playerHpBar.style.width = `${playerPct}%`;
        DOM.playerHpText.innerText = `${state.playerHP}/${state.maxPlayerHP}`;
    }

    function showFloatingText(container, text, color) {
        const el = document.createElement('div');
        el.className = 'damage-number';
        el.innerText = text;
        el.style.color = color;
        // 随机位置
        el.style.left = `${50 + (Math.random()*100 - 50)}px`;
        el.style.top = `${100 + (Math.random()*50 - 25)}px`;
        DOM.damageLayer.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    function triggerGameOver(reason) {
        AudioMgr.play('gameover');
        state.gameOver = true;
        DOM.overlayTitle.innerText = "MISSION FAILED";
        DOM.overlaySub.innerText = reason;
        setTimeout(() => DOM.overlay.classList.add('active'), 500);
    }

    // --- 保留的原有函数 (CreateTile, Render, Input等) ---
    // 为了节省篇幅，假设以下函数保持不变：
    // createTile, addRandomTile, moveTile, render, triggerTilt, 
    // getVector, buildTraversals, findFarthestPosition, movesAvailable,
    // updateEnergy, consumeEnergy, checkEnergy, saveHistory, applyUndo,
    // enterTargetMode, handleBoardClick, executePurge, setupInputs
    
    // ...此处粘贴之前的 render, createTile 等基础函数...
    
    // 这里为了完整性，我把必须的几个简单函数补上，复杂的沿用之前的逻辑即可
    function createTile(val) { return { id: state.uniqueId++, value: val, mergedFrom: null, isNew: true }; }
    function moveTile(from, to) { if(from===to)return; state.board[to]=state.board[from]; state.board[from]=null; }
    function render() {
        DOM.tileContainer.innerHTML = '';
        state.board.forEach((tile, index) => {
            if (!tile) return;
            const x = index % CONFIG.SIZE;
            const y = Math.floor(index / CONFIG.SIZE);
            const left = (x + 1) * CONFIG.GRID_GAP + x * CONFIG.CELL_SIZE;
            const top = (y + 1) * CONFIG.GRID_GAP + y * CONFIG.CELL_SIZE;
            const el = document.createElement('div');
            el.className = `tile t-${tile.value}`;
            if(tile.value > 2048) el.className += ' t-2048';
            el.style.left = `${left}px`; el.style.top = `${top}px`; el.textContent = tile.value;
            if(tile.isNew) { el.classList.add('tile-new'); tile.isNew = false; }
            if(tile.mergedFrom) { el.classList.add('tile-merged'); tile.mergedFrom = null; }
            DOM.tileContainer.appendChild(el);
        });
    }
    function updateEnergy(amt) { state.energy = Math.min(CONFIG.MAX_ENERGY, state.energy + amt); }
    function consumeEnergy(amt) { if(state.energy>=amt){state.energy-=amt; updateUI(); return true;} return false;}
    function checkEnergy(cost) { return state.energy >= cost; }
    function saveHistory() { 
        const snap = state.board.map(t=>t?{value:t.value, id:t.id}:null);
        state.history.push({board:snap, score:state.score, energy:state.energy, hp:state.playerHP, ehp:state.enemyHP});
        if(state.history.length>10) state.history.shift();
    }
    function applyUndo() {
        if(state.history.length<2) return;
        consumeEnergy(CONFIG.COST_UNDO);
        state.history.pop();
        const prev = state.history[state.history.length-1];
        state.board = prev.board.map(t=>t?{value:t.value, id:t.id, mergedFrom:null, isNew:false}:null);
        state.score = prev.score;
        // 注意：肉鸽模式下 Undo 会回退血量
        if(state.isRoguelike) { state.playerHP = prev.hp; state.enemyHP = prev.ehp; updateBattleUI(); }
        render(); updateUI();
    }
    function enterTargetMode() { state.isTargeting = true; DOM.board.classList.add('targeting'); }
    function handleBoardClick(e) {
        if(!state.isTargeting) return;
        const rect = DOM.board.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left - 15)/(CONFIG.CELL_SIZE+CONFIG.GRID_GAP));
        const row = Math.floor((e.clientY - rect.top - 15)/(CONFIG.CELL_SIZE+CONFIG.GRID_GAP));
        const idx = row*CONFIG.SIZE + col;
        if(state.board[idx]) {
            if(consumeEnergy(CONFIG.COST_PURGE)) {
                AudioMgr.play('skill');
                state.board[idx] = null; state.isTargeting=false; DOM.board.classList.remove('targeting');
                render(); saveHistory();
            }
        } else { state.isTargeting=false; DOM.board.classList.remove('targeting'); }
    }
    function getVector(dir) { return { 'Up': {x:0,y:-1}, 'Right': {x:1,y:0}, 'Down': {x:0,y:1}, 'Left': {x:-1,y:0} }[dir]; }
    function buildTraversals(vector) { const t={x:[0,1,2,3],y:[0,1,2,3]}; if(vector.x===1)t.x.reverse(); if(vector.y===1)t.y.reverse(); return t; }
    function findFarthestPosition(cell, vector) {
        let prev; let cx=cell%CONFIG.SIZE; let cy=Math.floor(cell/CONFIG.SIZE);
        do { prev={x:cx,y:cy}; cx+=vector.x; cy+=vector.y; } 
        while(cx>=0&&cx<CONFIG.SIZE&&cy>=0&&cy<CONFIG.SIZE&&state.board[cy*CONFIG.SIZE+cx]===null);
        return {farthest:prev.y*CONFIG.SIZE+prev.x, next:cy*CONFIG.SIZE+cx};
    }
    function movesAvailable() {
        if(state.board.includes(null))return true;
        for(let i=0;i<16;i++){
            const x=i%4,y=Math.floor(i/4);
            const v=state.board[i].value;
            if(x<3&&state.board[i+1].value===v)return true;
            if(y<3&&state.board[i+4].value===v)return true;
        } return false;
    }
    function triggerTilt(dir) {
        DOM.board.className='game-board'; void DOM.board.offsetWidth;
        const map={'Up':'tilt-up','Down':'tilt-down','Left':'tilt-left','Right':'tilt-right'};
        DOM.board.classList.add(map[dir]); setTimeout(()=>DOM.board.classList.remove(map[dir]),300);
    }
    function addRandomTile() {
        const empty=state.board.map((v,i)=>v?null:i).filter(v=>v!==null);
        if(!empty.length)return;
        state.board[empty[Math.floor(Math.random()*empty.length)]]=createTile(Math.random()<0.9?2:4);
        render();
    }
    function setupInputs() {
        document.addEventListener('keydown', e => {
            if (state.gameOver) return;
            const map = { 'ArrowUp':'Up', 'ArrowDown':'Down', 'ArrowLeft':'Left', 'ArrowRight':'Right' };
            if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
        });
        let ts = {x:0, y:0};
        DOM.board.parentNode.addEventListener('touchstart', e => { ts.x = e.touches[0].clientX; ts.y = e.touches[0].clientY; }, {passive:false});
        DOM.board.parentNode.addEventListener('touchend', e => {
            if (state.gameOver || state.isTargeting) return;
            const dx = e.changedTouches[0].clientX - ts.x;
            const dy = e.changedTouches[0].clientY - ts.y;
            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
            e.preventDefault();
            if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'Right' : 'Left');
            else move(dy > 0 ? 'Down' : 'Up');
        }, {passive:false});
    }

    init();
});
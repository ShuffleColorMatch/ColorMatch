// colormatch.js — versione completa 2-player
(() => {
    // ---- Helpers colori ----
    const DEG2RAD = Math.PI / 180;
    function hsl(h, s, l) { return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`; }
    function mod(n, m) { return ((n % m) + m) % m; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        let c = (1 - Math.abs(2 * l - 1)) * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
        else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
        else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
        else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
        else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
        else if (300 <= h && h < 360) [r, g, b] = [c, 0, x];
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }

    // ---- DOM refs ----
    const gridEl = document.getElementById('grid');
    const paletteEl = document.getElementById('palette');
    const startBtn = document.getElementById('startBtn');
    const modeSel = document.getElementById('mode');
    const shapeSel = document.getElementById('shape');
    const sizeSel = document.getElementById('size');
    const playersSel = document.getElementById('players');
    const timerEl = document.getElementById('timer');
    const turnEl = document.getElementById('turn');
    const scoreEl = document.getElementById('score');
    const messageEl = document.getElementById('message');
    const mainMenuEl = document.getElementById('mainMenu');
    const gameAreaEl = document.getElementById('gameArea');
    const backToMenuBtn = document.getElementById('backToMenu');
    const restartGameBtn = document.getElementById('restartGame');
    const showRankingBtn = document.getElementById('showRanking');
    const playersSelect = document.getElementById('players');
    const playerNamesLabel = document.getElementById('playerNamesLabel');
    const turnDiv = document.querySelector('#turn').parentElement; // il div che contiene "Turno"
    const modeSelect = document.getElementById('mode');
    const playersLabel = document.getElementById('playersLabel');
    function updateTurnVisibility() {
        if (playersSelect.value === '2') {
            turnDiv.style.display = 'block';  // mostra il div
        } else {
            turnDiv.style.display = 'none';   // nasconde il div
        }
    }

    // Aggiorna subito al caricamento
    updateTurnVisibility();

    // Aggiorna ogni volta che si cambia il numero di giocatori
    playersSelect.addEventListener('change', updateTurnVisibility);
    playersSelect.addEventListener('change', () => {
        if (playersSelect.value === "2") {
            playerNamesLabel.style.display = "flex"; // mostra input
        } else {
            playerNamesLabel.style.display = "none"; // nascondi
        }
    });

    // Pulsante Start
    startBtn.addEventListener('click', () => {
        mainMenuEl.style.display = 'none';
        gameAreaEl.style.display = 'flex'; // o block
        startGame(); // funzione che avvia il gioco (tutto ciò che avevi dentro startBtn originale)
    });

    function updateModeVisibility() {
        if (modeSelect.value === 'fill') {
            playersLabel.style.display = 'flex'; // mostra la select dei giocatori
            if (playersSel.value === "2") {
                playerNamesLabel.style.display = "flex"; // mostra input nomi
            } else {
                playerNamesLabel.style.display = "none"; // nascondi input nomi
            }
        } else {
            playersLabel.style.display = "none";        // nascondi select giocatori
            playerNamesLabel.style.display = "none";  // nascondi input nomi
        }
    }

    // listener modalità
    modeSelect.addEventListener('change', updateModeVisibility);

    // listener numero giocatori
    playersSelect.addEventListener('change', updateModeVisibility);

    // --- inizializza subito ---
    updateModeVisibility();

    // Pulsante Menu
    backToMenuBtn.addEventListener('click', () => {
        gameAreaEl.style.display = 'none';
        mainMenuEl.style.display = 'block';
        resetGameState(); // funzione che resetta tutto lo stato del gioco
    });

    // Pulsante Nuova Partita
    restartGameBtn.addEventListener('click', () => {
        resetGameState();
        startBtn.click(); // riusa lo start originale
    });

    // Pulsante Classifica
    showRankingBtn.addEventListener('click', () => {
        alert("Implementerò la classifica qui."); // placeholder
    });

    function message(txt) { messageEl.textContent = txt || ''; }

    function startGame() {
        state.mode = modeSel.value;
        state.players = Number(playersSel.value) || 1;
        state.scores = [0, 0];
        state.elapsed = [0, 0];
        state.currentPlayer = 0;
        state.timerStart = null;
        state.timerInterval = null;
        state.started = true;
        state.firstSelectedIndex = null;
        message('');

        const layout = generateLayout(shapeSel.value, sizeSel.value);
        const anchorColors = generateDistinctAnchorColorsWithSpecial(layout);
        const solution = interpolateColors(layout, anchorColors);
        state.layout = layout;
        state.solution = solution;

        buildGridDOM(layout, solution);

        if (state.mode === 'shuffle') startShuffle();
        else startFill();

        recomputePointsAndUI();
    }

    function resetGameState() {
        stopTimer();
        state.cells = [];
        state.rows = 0;
        state.cols = 0;
        state.layoutPositions = [];
        state.layoutAnchors = [];
        state.started = false;
        state.firstSelectedIndex = null;
        state.scores = [0, 0];
        state.elapsed = [0, 0];
        state.currentPlayer = 0;

        gridEl.innerHTML = '';
        paletteEl.innerHTML = '';
        message('');
    }

    // ---- state ----
    let state = {
        cells: [], rows: 0, cols: 0, layoutPositions: [], layoutAnchors: [],
        mode: 'shuffle', players: 1, scores: [0, 0], elapsed: [0, 0], currentPlayer: 0,
        timerStart: null, timerInterval: null, started: false, firstSelectedIndex: null
    };

    // ---- Layout generator ----
    function generateLayout(shape, sizeKey) {
        if (shape === 'square') {
            const n = (sizeKey === 'small') ? 4 : (sizeKey === 'medium') ? 5 : 6;
            const positions = [];
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) positions.push({ r, c });
            const anchors = [{ r: 0, c: 0 }, { r: 0, c: n - 1 }, { r: n - 1, c: 0 }, { r: n - 1, c: n - 1 }];
            return { positions, rows: n, cols: n, anchors };
        }
        if (shape === 'pyramid') {
            const rowsArr = (sizeKey === 'small') ? [7, 5, 3, 1] : (sizeKey === 'medium')? [7, 7, 5, 3, 1] : [7, 7, 5, 5, 3, 1];
            const maxW = Math.max(...rowsArr);
            const positions = [];
            const numCols = rowsArr.length, numRows = maxW;
            rowsArr.forEach((len, layerIdx) => {
                const offset = Math.floor((maxW - len) / 2);
                for (let c = 0; c < len; c++) {
                    const r = offset + c;
                    positions.push({ r, c: layerIdx });
                }
            });
            const anchors = [];
            const tipR = Math.floor(maxW / 2), tipC = numCols - 1;
            anchors.push({ r: tipR, c: tipC });  // punta destra
            anchors.push({ r: 0, c: 0 });         // estremità sinistra top
            anchors.push({ r: maxW - 1, c: 0 });  // estremità sinistra bottom
            return { positions, rows: numRows, cols: numCols, anchors };
        }
        return generateLayout('square', 'small');
    }

    function randomDistinctColor(exclude = []) {
        while (true) {
            const h = Math.random() * 360;
            const s = 90 + Math.random() * 10;
            const l = 50 + Math.random() * 10;
            const key = `${Math.round(h)}_${Math.round(s)}_${Math.round(l)}`;
            if (!exclude.includes(key)) return { h, s, l };
        }
    }

    function interpolateColors(layout, anchorColors) {
        let grid = Array(layout.rows).fill().map(() => Array(layout.cols).fill(null));
        // Quadrato
        if (layout.cols === layout.rows) {
            const n = layout.rows - 1;
            const corners = layout.anchors.map((a, i) => hslToRgb(anchorColors[i].h, anchorColors[i].s, anchorColors[i].l));
            for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
                if (grid[r][c]) continue;
                let rgb = [0, 0, 0];
                const x = c / n, y = r / n;
                for (let i = 0; i < 3; i++) {
                    const top = lerp(corners[0][i], corners[1][i], x);
                    const bottom = lerp(corners[2][i], corners[3][i], x);
                    rgb[i] = Math.round(lerp(top, bottom, y));
                }
                grid[r][c] = { css: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` };
            }
            layout.anchors.forEach((a, i) => {
                const c = corners[i];
                grid[a.r][a.c] = { css: `rgb(${c[0]},${c[1]},${c[2]})` };
            });
            return grid;
        }
        // Piramide
        const tipRGB = hslToRgb(anchorColors[0].h, anchorColors[0].s, anchorColors[0].l);
        const leftTopRGB = hslToRgb(anchorColors[1].h, anchorColors[1].s, anchorColors[1].l);
        const leftBottomRGB = hslToRgb(anchorColors[2].h, anchorColors[2].s, anchorColors[2].l);

        layout.positions.forEach(pos => {
            const colCells = layout.positions.filter(p => p.c === pos.c).sort((a, b) => a.r - b.r);
            const tV = (pos.r - colCells[0].r) / (colCells[colCells.length - 1].r - colCells[0].r || 1);
            let rgb = [0, 0, 0];
            for (let i = 0; i < 3; i++) {
                let baseRGB = lerp(leftTopRGB[i], leftBottomRGB[i], tV);
                let factorH = pos.c / (layout.cols - 1);
                rgb[i] = Math.round(lerp(baseRGB, tipRGB[i], factorH));
            }
            grid[pos.r][pos.c] = { css: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` };
        });
        const tipPos = layout.positions.find(p => p.c === layout.cols - 1);
        if (tipPos) grid[tipPos.r][tipPos.c] = { css: `rgb(${tipRGB[0]},${tipRGB[1]},${tipRGB[2]})` };
        return grid;
    }

    function buildGridDOM(layout, solution) {
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${layout.cols},1fr)`;
        gridEl.style.gridTemplateRows = `repeat(${layout.rows},auto)`;
        state.cells = []; state.rows = layout.rows; state.cols = layout.cols; state.layoutPositions = layout.positions; state.layoutAnchors = layout.anchors;
        const posSet = new Map(); layout.positions.forEach((p, i) => posSet.set(`${p.r},${p.c}`, i));
        for (let r = 0; r < layout.rows; r++) for (let c = 0; c < layout.cols; c++) {
            const key = `${r},${c}`;
            if (!posSet.has(key)) { const spacer = document.createElement('div'); spacer.className = 'cell spacer'; spacer.style.visibility = 'hidden'; gridEl.appendChild(spacer); continue; }
            const idx = posSet.get(key);
            const el = document.createElement('div'); el.className = 'cell'; el.dataset.r = r; el.dataset.c = c;
            const badge = document.createElement('span'); badge.className = 'pts'; badge.textContent = ''; el.appendChild(badge);
            const isAnchor = layout.anchors.some(a => a.r === r && a.c === c);
            const target = solution[r][c];
            const cellObj = { r, c, el, target, cur: null, locked: false, isAnchor };
            if (isAnchor) { cellObj.locked = true; cellObj.cur = target; el.style.background = target.css; el.classList.add('locked'); badge.style.display = 'none'; }
            else { el.style.background = '#222'; badge.style.display = 'none'; }
            gridEl.appendChild(el); state.cells.push(cellObj);
        }
    }

    // ---- shuffle / swap / check ----
    function shuffleArray(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

    function startShuffle() {
        const allColors = state.cells.map(c => c.target.css);
        let pool = shuffleArray(allColors.slice());
        const anchoredColors = state.cells.filter(c => c.isAnchor).map(c => c.target.css);
        anchoredColors.forEach(col => { const i = pool.indexOf(col); if (i >= 0) pool.splice(i, 1); });
        const nonLocked = state.cells.filter(c => !c.locked);
        if (pool.length < nonLocked.length) pool = shuffleArray(nonLocked.map(c => c.target.css)); else pool = shuffleArray(pool);
        nonLocked.forEach((cell, i) => {
            const css = pool[i % pool.length];
            const foundTarget = state.cells.find(s => s.target.css === css)?.target;
            cell.cur = foundTarget ? { ...foundTarget } : { h: 0, s: 0, l: 0, css };
            cell.el.style.background = cell.cur.css;
            cell.el.classList.remove('locked', 'correct'); cell.el.querySelector('.pts').style.display = 'none'; cell.el.draggable = true;
        });
        attachShuffleHandlers(); recomputeUI();
    }

    function attachShuffleHandlers() {
        state.firstSelectedIndex = null;
        state.cells.forEach((cellObj, idx) => {
            const el = cellObj.el;
            el.onclick = null; el.ondragstart = null; el.ondragover = null; el.ondrop = null;
            if (cellObj.locked) { el.style.pointerEvents = 'none'; return; }
            el.onclick = () => {
                ensureTimerStarted(); // avvia timer solo al primo click
                if (cellObj.locked) return;
                if (state.firstSelectedIndex === null) { state.firstSelectedIndex = idx; el.classList.add('selected'); }
                else if (state.firstSelectedIndex === idx) { state.firstSelectedIndex = null; el.classList.remove('selected'); }
                else { swapIndices(state.firstSelectedIndex, idx); state.cells[state.firstSelectedIndex]?.el.classList.remove('selected'); state.firstSelectedIndex = null; checkAllCorrectAfterShuffle(); }
            };
            el.draggable = true;
            el.ondragstart = ev => { ev.dataTransfer.setData('text/plain', idx.toString()); };
            el.ondragover = ev => ev.preventDefault();
            el.ondrop = ev => { ensureTimerStarted(); ev.preventDefault(); const from = parseInt(ev.dataTransfer.getData('text/plain'), 10); if (!Number.isNaN(from) && from !== idx) { swapIndices(from, idx); checkAllCorrectAfterShuffle(); } };
        });
    }

    function swapIndices(i, j) { const a = state.cells[i], b = state.cells[j]; const tmp = a.cur; a.cur = b.cur; b.cur = tmp; a.el.style.background = a.cur ? a.cur.css : 'transparent'; b.el.style.background = b.cur ? b.cur.css : 'transparent'; }

    function checkAllCorrectAfterShuffle() {
        let allCorrect = true;
        state.cells.forEach(cell => {
            if (cell.locked) return;
            const isCorrect = cell.cur && cell.cur.css === cell.target.css;
            if (isCorrect) {
                cell.locked = true;
                cell.cur = cell.target;
                cell.el.style.background = cell.target.css;
                cell.el.classList.add('locked', 'correct');
                cell.el.style.pointerEvents = 'none';
            } else allCorrect = false;
        });

        recomputeUI();

        if (allCorrect) {
            stopTimer();{
                const time = formatTime(Math.round(state.elapsed[0] / 1000));
                message(`Completato — shuffle! Tempo: (${time})`);
            }
        }
    }


    // ---- timer “ritardato” ----
    function ensureTimerStarted() {
        if (!state.timerStart) startTimer();
    }

    // ---- modalità fill ----
    function startFill() {
        // reset celle
        state.cells.forEach(c => {
            const badge = c.el.querySelector('.pts');
            if (!c.locked) {
                c.cur = null;
                c.el.style.background = '#222';
                c.el.classList.remove('locked', 'correct');
                c.el.style.pointerEvents = '';
                if (badge) badge.style.display = 'block';
            } else {
                if (badge) badge.style.display = 'none';
            }
        });

        // costruisci palette
        paletteEl.innerHTML = '';
        const colors = state.cells.filter(c => !c.locked).map(c => c.target.css);
        const pool = shuffleArray(colors);

        pool.forEach(css => {
            const peg = document.createElement('div');
            peg.className = 'peg';
            peg.style.background = css;
            peg.draggable = true;
            peg.dataset.css = css;

            // dragstart → avvia timer se non partito
            peg.addEventListener('dragstart', ev => {
                ensureTimerStarted();
                ev.dataTransfer.setData('color', css);
            });

            // click → selezione peg
            peg.addEventListener('click', () => {
                ensureTimerStarted();
                const already = peg.classList.toggle('picked');
                paletteEl.querySelectorAll('.peg').forEach(p => { if (p !== peg) p.classList.remove('picked'); });
                attachCellClickForPicked();
            });

            paletteEl.appendChild(peg);
        });

        // assegna drop/click alle celle
        attachCellClickForPicked();

        // inizializza punti
        updatePoints();
        recomputePointsAndUI();
    }

    // click sulle celle
    function attachCellClickForPicked() {
        state.cells.forEach((c, idx) => {
            if (c.locked) return;

            // --- click su cella ---
            c.el.onclick = () => {
                ensureTimerStarted();
                const picked = paletteEl.querySelector('.peg.picked');
                if (!picked) return;

                const css = picked.dataset.css;
                const match = state.cells.find(x => x.target.css === css);
                const colObj = match ? match.target : { h: 0, s: 0, l: 0, css };
                handlePlace(idx, colObj, picked);
            };

            // --- drag&drop su cella ---
            c.el.ondragover = ev => ev.preventDefault();
            c.el.ondrop = ev => {
                ensureTimerStarted();
                ev.preventDefault();
                const css = ev.dataTransfer.getData('color');
                if (!css) return;

                const match = state.cells.find(x => x.target.css === css);
                const colObj = match ? match.target : { h: 0, s: 0, l: 0, css };
                handlePlace(idx, colObj);

                // rimuovi peg dalla palette
                const peg = [...paletteEl.querySelectorAll('.peg')]
                    .find(p => p.dataset.css === css);
                if (peg) peg.remove();
            };
        });
    }

    // aggiorna punteggi in base alla distanza ortogonale da celle già posizionate
    function updatePoints() {
        const distMap = state.cells.map(c => c.locked ? 0 : Infinity);
        const queue = state.cells.map((c, idx) => c.locked ? idx : -1).filter(i => i >= 0);

        while (queue.length > 0) {
            const currentIdx = queue.shift();
            const currentCell = state.cells[currentIdx];
            const curDist = distMap[currentIdx];

            const neighbors = state.cells
                .map((c, idx) => ({ c, idx }))
                .filter(({ c, idx }) => distMap[idx] === Infinity &&
                    (Math.abs(c.r - currentCell.r) + Math.abs(c.c - currentCell.c) === 1)
                );

            neighbors.forEach(n => {
                distMap[n.idx] = curDist + 1;
                queue.push(n.idx);
            });
        }

        state.cells.forEach((c, idx) => {
            const badge = c.el.querySelector('.pts');
            if (!c.locked && badge) badge.textContent = distMap[idx] === Infinity ? '-' : distMap[idx];
            if (c.locked && badge) badge.style.display = 'none';
        });
    }

    // piazza tile
    function handlePlace(cellIndex, colObj, pegEl) {
        const cell = state.cells[cellIndex];
        if (cell.locked) return;

        const badge = cell.el.querySelector('.pts');
        const pts = parseInt(badge?.textContent) || 0;

        if (colObj.css === cell.target.css) {
            // --- Tile corretta ---
            cell.cur = cell.target;
            cell.locked = true;
            cell.el.style.background = cell.target.css;
            cell.el.classList.add('locked', 'correct');
            if (badge) badge.style.display = 'none';
            if (pegEl) pegEl.remove();

            state.scores[state.currentPlayer] += pts;
            updatePoints();
            recomputePointsAndUI();

            if (state.cells.every(c => c.locked)) {
                stopTimer();
                showFinalScores();
                return;
            }
        } else {
            // --- Tile sbagliata ---
            if (state.players === 1) {
                addPenaltySeconds(5);
            }

            // effetto "flash rosso" sulla cella
            cell.el.classList.add('wrong');
            setTimeout(() => cell.el.classList.remove('wrong'), 400);

            // effetto "shake" sulla pedina della palette
            if (pegEl) {
                pegEl.classList.add('wrong');
                pegEl.classList.remove('picked'); // disattiva la selezione
                setTimeout(() => pegEl.classList.remove('wrong'), 400);
            }
        }

        if (state.players === 2) switchTurn();
    }

    // visualizza punteggi finali
    function showFinalScores() {
        if (state.players === 2) {
            const time1 = state.elapsed[0] || 0;
            const time2 = state.elapsed[1] || 0;
            const formattedTime1 = formatTime(Math.round(time1 / 1000));
            const formattedTime2 = formatTime(Math.round(time2 / 1000));

            // Determina il vincitore
            let winner;
            if (state.scores[0] > state.scores[1]) {
                winner = players[0];
            } else if (state.scores[1] > state.scores[0]) {
                winner = players[1];
            } else {
                // pareggio nei punti → chi ha tempo minore
                winner = (time1 < time2) ? players[0] : (time2 < time1) ? players[1] : null;
            }

            let finalMessage = `Fine gioco!\n` +
                `${players[0]}: ${state.scores[0]} punti (${formattedTime1})\n` +
                `${players[1]}: ${state.scores[1]} punti (${formattedTime2})\n`;

            if (winner) {
                finalMessage += `\nVINCE ${winner}!!`;
            } else {
                finalMessage += `\nPAREGGIO!!`;
            }

            message(finalMessage);

        } else {
            const time = formatTime(Math.round((state.elapsed[0] || 0) / 1000));
            message(`Fine gioco! Punteggio: ${state.scores[0]} (${time})`);
        }
    }

    function generateDistinctAnchorColorsWithSpecial(layout) {
        const numAnchors = layout.anchors.length;
        const anchors = [];
        let whiteUsed = false;
        let blackUsed = false;

        for (let i = 0; i < numAnchors; i++) {
            let candidate;

            // ---- Caso punta piramide ----
            if (layout.shape === 'pyramid' && i === 0) {
                candidate = Math.random() < 0.5
                    ? { h: 0, s: 0, l: 100 }  // bianco
                    : { h: 0, s: 0, l: 0 };   // nero
                specialUsed = true;
                anchors.push(candidate);
                continue;
            }

            // ---- Caso quadrato: massimo un bianco/nero ----
            if (layout.shape === 'square') {
                const pickSpecial = Math.random() < 0.5;
                if (pickSpecial) {
                    if (!whiteUsed && !blackUsed) {
                        // scegli casualmente bianco o nero
                        if (Math.random() < 0.5) {
                            candidate = { h: 0, s: 0, l: 100 }; // bianco
                            whiteUsed = true;
                        } else {
                            candidate = { h: 0, s: 0, l: 0 };   // nero
                            blackUsed = true;
                        }
                        anchors.push(candidate);
                        continue;
                    } else if (!whiteUsed) {
                        candidate = { h: 0, s: 0, l: 100 }; // bianco
                        whiteUsed = true;
                        anchors.push(candidate);
                        continue;
                    } else if (!blackUsed) {
                        candidate = { h: 0, s: 0, l: 0 }; // nero
                        blackUsed = true;
                        anchors.push(candidate);
                        continue;
                    }
                }
            }

            // ---- Altri anchor: colori distinti ----
            while (true) {
                candidate = randomDistinctColor();
                const minDist = 60; // distanza minima HSL
                let ok = true;
                for (const c of anchors) {
                    const dh = Math.abs(candidate.h - c.h);
                    const ds = Math.abs(candidate.s - c.s);
                    const dl = Math.abs(candidate.l - c.l);
                    if (dh + ds + dl < minDist) { ok = false; break; }
                }
                if (ok) break;
            }
            anchors.push(candidate);
        }

        return anchors;
    }

    // ---- startBtn senza avviare timer
    startBtn.addEventListener('click', () => {
        state.mode = modeSel.value;
        state.players = Number(playersSel.value) || 1;
        state.scores = [0, 0];
        state.elapsed = [0, 0];
        state.currentPlayer = 0;
        state.timerStart = null;
        state.timerInterval = null;
        state.started = true;
        state.firstSelectedIndex = null;
        message('');

        const layout = generateLayout(shapeSel.value, sizeSel.value);
        layout.shape = shapeSel.value;
        let numAnchors = layout.anchors.length;
        const anchorColors = generateDistinctAnchorColorsWithSpecial(layout);
        const solution = interpolateColors(layout, anchorColors);
        state.layout = layout;
        state.solution = solution;

        buildGridDOM(layout, solution);

        if (state.mode === 'shuffle') startShuffle();
        else startFill();

        // NON avviare timer qui
        recomputePointsAndUI();
    });


    // ---- timer / UI ----
    // ---- distanza colore / punti ----
    function computeDistanceRGB(c1, c2) { const r = c1.r - c2.r; const g = c1.g - c2.g; const b = c1.b - c2.b; return Math.sqrt(r * r + g * g + b * b); }
    function computeDistances() { return state.cells.map(c => { if (!c.cur) return 0; const cTarget = hexToRgb(c.target.css); const cCur = hexToRgb(c.cur.css); return 100 - computeDistanceRGB(cTarget, cCur); }); }
    function hexToRgb(css) { if (css.startsWith('rgb')) { const m = css.match(/\d+/g); return { r: +m[0], g: +m[1], b: +m[2] }; } return { r: 0, g: 0, b: 0 }; }
    function recomputePointsAndUI() {
        scoreEl.textContent = state.players === 1 ? state.scores[0] : `${state.scores[0]} / ${state.scores[1]}`; turnEl.textContent = state.players === 1 ? '—' : players[state.currentPlayer]; const ms = getCurrentPlayerElapsedMs(); timerEl.textContent = formatTime(Math.round(ms / 1000)); }
    function recomputeUI() {
        scoreEl.textContent = (state.players === 1) ? state.scores[0] : `${state.scores[0]} / ${state.scores[1]}`; turnEl.textContent = state.players === 1 ? '—' : players[state.currentPlayer]; const ms = getCurrentPlayerElapsedMs(); timerEl.textContent = formatTime(Math.round(ms / 1000)); }
    function getCurrentPlayerElapsedMs() { return state.timerStart ? (state.elapsed[state.currentPlayer] || 0) + (Date.now() - state.timerStart) : (state.elapsed[state.currentPlayer] || 0); }
    function formatTime(s) { const mm = String(Math.floor(s / 60)).padStart(2, '0'); const ss = String(Math.floor(s % 60)).padStart(2, '0'); return `${mm}:${ss}`; }
    function startTimer() { stopTimer(); state.timerStart = Date.now(); state.timerInterval = setInterval(recomputeUI, 250); }
    function stopTimer() { if (state.timerInterval) clearInterval(state.timerInterval); state.timerInterval = null; if (state.timerStart) { const delta = Date.now() - state.timerStart; state.elapsed[state.currentPlayer] = (state.elapsed[state.currentPlayer] || 0) + delta; state.timerStart = null; } recomputeUI(); }
    function addPenaltySeconds(sec) { state.elapsed[state.currentPlayer] = (state.elapsed[state.currentPlayer] || 0) + sec * 1000; recomputeUI(); }

    // ---- ESC clear selection ----
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (state.firstSelectedIndex !== null) { state.cells[state.firstSelectedIndex]?.el.classList.remove('selected'); state.firstSelectedIndex = null; }
            paletteEl.querySelectorAll('.peg').forEach(p => p.classList.remove('picked'));
        }
    });

    const player1Input = document.getElementById('player1');
    const player2Input = document.getElementById('player2');
    const turnName = document.querySelector('#turn'); // span dentro "Turno"
    let players = [];
    let currentPlayerIndex = 0;

    // Quando clicchi Start
    document.getElementById('startBtn').addEventListener('click', () => {
        if (playersSelect.value === '2') {
            // Prendi i nomi dai campi input
            players = [
                player1Input.value.trim() || 'Giocatore 1',
                player2Input.value.trim() || 'Giocatore 2'
            ];
            currentPlayerIndex = 0;
            setcurrentPlayer = 0;
            updateTurnDisplay();
        }
    });

    // Funzione per aggiornare il div turno
    function updateTurnDisplay() {
        if (state.players === 2) {
            document.getElementById('turn').textContent = players[currentPlayerIndex];
        } else {
            document.getElementById('turn').textContent = '—';
        }
    }
    function switchTurn() {
        if (state.players !== 2) return;
        stopTimer();
        currentPlayerIndex = 1 - currentPlayerIndex; // cambia indice
        state.currentPlayer = currentPlayerIndex;   // sincronizza con lo stato
        startTimer();
        updateTurnDisplay();                        // aggiorna il box sopra
        message(`Turno di ${players[currentPlayerIndex]}`); // messaggio sotto
    }



    window.__cm = { state };
})();
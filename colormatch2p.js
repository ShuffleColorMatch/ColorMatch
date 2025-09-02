// ----------------- MODALITÀ 2 GIOCATORI -----------------
let players = [
    { name: "", score: 0, elapsedTime: 0 },
    { name: "", score: 0, elapsedTime: 0 }
];
let currentPlayerIndex = 0;
let turnStartTime = null;
let turnTimerInterval = null;
let selectedTile2p = null;

// Nascondi score e timer della modalità singola
const oldScoreDiv = document.getElementById("score");
const oldTimerDiv = document.getElementById("timer");
if (oldScoreDiv) oldScoreDiv.style.display = "none";
if (oldTimerDiv) oldTimerDiv.style.display = "none";

// Crea elementi dedicati a 2 giocatori
let scoreDiv2p = document.createElement("div");
scoreDiv2p.id = "score2p";
scoreDiv2p.style.marginBottom = "10px";
scoreDiv2p.style.fontSize = "3.5rem";

let timerDiv2p = document.createElement("div");
timerDiv2p.id = "timer2p";
timerDiv2p.style.fontSize = "3.5rem";

document.getElementById("app").prepend(timerDiv2p);
document.getElementById("app").prepend(scoreDiv2p);

// ----------------- SETUP NOMI -----------------
function setupTwoPlayers() {
    players[0].name = prompt("Inserisci il nome del Giocatore 1") || "Giocatore 1";
    players[1].name = prompt("Inserisci il nome del Giocatore 2") || "Giocatore 2";
    players[0].score = 0; players[0].elapsedTime = 0;
    players[1].score = 0; players[1].elapsedTime = 0;
    currentPlayerIndex = 0;
    updateScoreDisplay2p();
    startTurn();
}

// ----------------- TIMER -----------------
function startTurn() {
    turnStartTime = Date.now();
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    turnTimerInterval = setInterval(updateTimerDisplay2p, 500);
    updateTimerDisplay2p();
}

function stopTurn() {
    const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
    players[currentPlayerIndex].elapsedTime += elapsed;
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
}

function updateTimerDisplay2p() {
    let elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
    const total = players[currentPlayerIndex].elapsedTime + elapsed;
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    timerDiv2p.textContent = `Turno di ${players[currentPlayerIndex].name}: ${minutes}:${seconds}`;
}

// ----------------- PUNTEGGIO -----------------
function updateScoreDisplay2p() {
    scoreDiv2p.textContent = `${players[0].name}: ${players[0].score} punti | ${players[1].name}: ${players[1].score} punti`;
}

// ----------------- GESTIONE MOVE -----------------
function handleTwoPlayerMove(cell, placedColor) {
    const key = `${cell.dataset.y},${cell.dataset.x}`;
    const correctColor = solution[key];
    let pointsGained = 0;

    if (correctColor &&
        placedColor[0] === correctColor[0] &&
        placedColor[1] === correctColor[1] &&
        placedColor[2] === correctColor[2]) {

        pointsGained = parseInt(cell.dataset.points || "0", 10);
        players[currentPlayerIndex].score += pointsGained;
        cell.style.background = rgbToCss(correctColor);
        cell.dataset.filled = "true";
        cell.classList.add("fixed");
        cell.style.border = "3px solid gold";

        if (selectedTile2p) {
            selectedTile2p.remove(); // solo se corretta
            selectedTile2p = null;
        }
    } else {
        cell.dataset.filled = "false";
        if (selectedTile2p) selectedTile2p.classList.remove("selected");
        selectedTile2p = null;
    }

    updateScoreDisplay2p();

    // Passa turno
    stopTurn();
    currentPlayerIndex = 1 - currentPlayerIndex;
    startTurn();

    checkTwoPlayerGameEnd();
}

// ----------------- CONTROLLO FINE PARTITA -----------------
function checkTwoPlayerGameEnd() {
    if (isGridComplete()) {
        stopTurn();
        let winnerText = "";
        if (players[0].score > players[1].score) winnerText = `${players[0].name} vince!`;
        else if (players[1].score > players[0].score) winnerText = `${players[1].name} vince!`;
        else winnerText = players[0].elapsedTime < players[1].elapsedTime ? `${players[0].name} vince per tempo!` :
            players[1].elapsedTime < players[0].elapsedTime ? `${players[1].name} vince per tempo!` : "Pareggio!";

        const winnerDiv = document.getElementById("twoPlayerResult");
        winnerDiv.innerHTML = `
            <h2>Risultato</h2>
            <p>${winnerText}</p>
            <p>${players[0].name}: ${players[0].score} punti, tempo: ${players[0].elapsedTime}s</p>
            <p>${players[1].name}: ${players[1].score} punti, tempo: ${players[1].elapsedTime}s</p>
        `;
        winnerDiv.style.display = "block";
    }
}

// ----------------- INTERAZIONE POOL/GRID -----------------
// Click pool
pool.addEventListener("click", e => {
    if (!e.target.classList.contains("tile")) return;
    if (selectedTile2p) selectedTile2p.classList.remove("selected");
    selectedTile2p = e.target;
    selectedTile2p.classList.add("selected");
});

// Click griglia
grid.addEventListener("click", e => {
    if (!selectedTile2p) return;
    const cell = e.target;
    if (!cell.classList.contains("cell") || cell.classList.contains("fixed")) return;
    const placedColor = JSON.parse(selectedTile2p.dataset.color);
    handleTwoPlayerMove(cell, placedColor);
});

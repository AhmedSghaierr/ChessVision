const board = Chessboard('board', { draggable: false, position: 'start' });
const game = new Chess();

// Use online Stockfish
const engine = new Worker('https://cdn.jsdelivr.net/gh/niklasf/stockfish.js/stockfish.js');

engine.onmessage = function(event) {
    console.log(event.data);
};

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const pgnText = document.getElementById('pgnInput').value;
    if (!game.load_pgn(pgnText)) {
        alert("Invalid PGN!");
        return;
    }

    const moves = game.history();
    let reviewHtml = "<h2>Move Review:</h2><ol>";

    let boardPosition = new Chess();

    for (let i = 0; i < moves.length; i++) {
        boardPosition.move(moves[i]);
        const fen = boardPosition.fen();

        const evalScore = await getEvaluation(fen);

        let comment = "";
        if (evalScore <= 50 && evalScore >= -50) comment = `<span class='good'>Good move</span>`;
        else if (evalScore > 50 && evalScore <= 150 || evalScore < -50 && evalScore >= -150) comment = `<span class='inaccuracy'>Inaccuracy</span>`;
        else if (evalScore > 150 && evalScore <= 300 || evalScore < -150 && evalScore >= -300) comment = `<span class='mistake'>Mistake</span>`;
        else comment = `<span class='blunder'>Blunder</span>`;

        reviewHtml += `<li>${moves[i]} - ${comment}</li>`;
    }

    reviewHtml += "</ol>";
    document.getElementById('review').innerHTML = reviewHtml;
    board.position(game.fen());
});

function getEvaluation(fen) {
    return new Promise(resolve => {
        engine.onmessage = function(event) {
            const line = event.data;
            if (line.startsWith("info depth") && line.includes("score cp")) {
                const match = line.match(/score cp (-?\d+)/);
                if (match) resolve(parseInt(match[1]));
            }
        };
        engine.postMessage(`position fen ${fen}`);
        engine.postMessage('go depth 12');
    });
}
/* global document, window */

'use strict';


const game = {};


game.FIELD_WIDTH        =   12;
game.FIELD_HEIGHT       =   22;
game.HIDDEN_ROWS        =    2;
game.BLOCK_SIZE         =   24;
game.BASE_FALL_INTERVAL = 1000;

game.field = Array.from(
	{ length: game.FIELD_HEIGHT },
	() => Array(game.FIELD_WIDTH).fill(0)
);

game.fallInterval = game.BASE_FALL_INTERVAL;
game.rowsCleared = 0;
game.score = 0;
game.scoreMultiplier = 1;

game.structs = [
	[
		[0, 0, 0, 0],
		[1, 1, 1, 1],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
	[
		[1, 1],
		[1, 1],
	],
	[
		[0, 1, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	[
		[0, 1, 1],
		[1, 1, 0],
		[0, 0, 0],
	],
	[
		[1, 1, 0],
		[0, 1, 1],
		[0, 0, 0],
	],
	[
		[1, 0, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	[
		[0, 0, 1],
		[1, 1, 1],
		[0, 0, 0],
	],
];

game.canvas = document.getElementById('game');
game.canvas.width  = game.FIELD_WIDTH  * game.BLOCK_SIZE;
game.canvas.height = (game.FIELD_HEIGHT - game.HIDDEN_ROWS) * game.BLOCK_SIZE;
game.ctx = game.canvas.getContext('2d');

game.canvasNext = document.getElementById('game-next');
game.canvasNext.width = game.structs.reduce((w, s) => Math.max(w, s[0].length), 0) * game.BLOCK_SIZE;
game.canvasNext.height = game.structs.reduce((h, s) => Math.max(h, s.length), 0) * game.BLOCK_SIZE;
game.ctxNext = game.canvasNext.getContext('2d');

game.scoreSpan = document.getElementById('game-score');


game.fits = function(p, offsetI = 0, offsetJ = 0) {
	return p.struct.every((row, i) => row.every((cell, j) => {
		return !cell || game.field[p.i+i+offsetI] && game.field[p.i+i+offsetI][p.j+j+offsetJ] === 0;
	}));
};


game.getRandomStruct = function() {
	const i = Math.floor(Math.random() * game.structs.length);
	return game.structs[i];
};


game.randomColor = function() {
	const rgb = [
		192 + Math.random() * 64 | 0,
		Math.random() * 256 | 0,
		Math.random() * 192 | 0,
	].sort(() => Math.random() - .5);
	return `rgb(${rgb.join(',')})`;
};


game.createPiece = function(type, i, j) {
	const p = game.activePiece = game.nextPiece;
	const color = game.randomColor();

	game.nextPiece = {
		struct: (game.structs[type] || game.getRandomStruct())
			.map(row => row.map(cell => cell && color))
	};

	if (!p) return game.createPiece(null, i, j);

	p.i = (i != null) ? i : 0;
	p.j = (j != null) ? j : Math.floor((game.FIELD_WIDTH - p.struct[0].length) / 2);

	if (!game.fits(p)) {
		game.isStopped = true;
		game.scoreSpan.innerText = `GAME OVER. score: ${game.score}`;
	} else {
		game.drawNext();
	}

	return game;
};


game.rotate = function() {
	if (game.isStopped || game.isPaused) return false;
	const p = game.activePiece;
	const s = p.struct;
	const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
	if (!game.fits({ struct: rotated, i: p.i, j: p.j })) return false;
	p.struct = rotated;
	game.draw();
	return true;
};


game.move = function(offsetI = 0, offsetJ = 0) {
	if (game.isStopped || game.isPaused) return false;
	const p = game.activePiece;
	if (!game.fits(p, offsetI, offsetJ)) return false;
	p.i += offsetI;
	p.j += offsetJ;
	game.draw();
	return true;
};


game.moveLeft = function() {
	return game.move(0, -1);
};


game.moveRight = function() {
	return game.move(0, 1);
};


game.moveDown = function() {
	return game.move(1);
};


game._fall = function() {
	if (game.isStopped || game.isPaused) return;
	if (game.moveDown()) return game.fall();

	const p = game.activePiece;

	p.struct.forEach((pRow, i) => pRow.forEach((pCell, j) => {
		if (!pCell) return;
		game.field[p.i+i][p.j+j] = pCell;
	}));

	game.score += Math.floor(game.scoreMultiplier);
	game.scoreSpan.innerText = game.score;

	game.draw();
	game.play();
};


game.fall = function() {
	if (game.isStopped || game.isPaused) return game;
	game._fallTimeout = setTimeout(game._fall, game.fallInterval);
	return game;
};


game.clear = function() {
	let rowsCleared = 0;
	for (let i = game.FIELD_HEIGHT-1, l = 0; i >= l; ) {
		if (game.field[i].some(cell => !cell)) {
			i--;
			continue;
		}

		game.rowsCleared++;
		rowsCleared++;
		l++;

		for (let ii = i; ii > l; ii--) {
			game.field[ii] = game.field[ii-1];
		}

		game.field[l] = Array(game.FIELD_WIDTH).fill(0);

		game.score += Math.floor(game.FIELD_WIDTH * game.rowsCleared * rowsCleared * game.scoreMultiplier);
		game.scoreMultiplier = Math.sqrt(game.rowsCleared);
		game.fallInterval = game.BASE_FALL_INTERVAL / game.scoreMultiplier;
		game.scoreSpan.innerText = (game.score);
		console.log(game.scoreMultiplier, game.fallInterval);
	}

	return game;
};


game._draw = function() {
	const ctx = game.ctx;
	const p = game.activePiece || [];

	const drawField = p.struct.reduce((drawField, pRow, i) => {
		pRow.forEach((pCell, j) => {
			if (!pCell || p.i+i < game.HIDDEN_ROWS) return;
			drawField[p.i+i-game.HIDDEN_ROWS][p.j+j] = pCell;
		});
		return drawField;
	}, game.field.slice(game.HIDDEN_ROWS, game.FIELD_HEIGHT).map(row => row.slice()));

	ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

	drawField.forEach((row, i) => row.forEach((cell, j) => {
		if (!cell) return;
		ctx.fillStyle = cell;
		ctx.beginPath();
		ctx.rect(
			j * game.BLOCK_SIZE,
			i * game.BLOCK_SIZE,
			game.BLOCK_SIZE,
			game.BLOCK_SIZE
		);
		ctx.fill();
		ctx.stroke();
	}));

	return game;
};


game.draw = function() {
	window.requestAnimationFrame(game._draw);
	return game;
};


game._drawNext = function() {
	const
		w = game.canvasNext.width,
		h = game.canvasNext.height;

	const p = game.nextPiece;
	const s = p.struct;
	const ctx = game.ctxNext;

	ctx.clearRect(0, 0, w, h);

	// const dx = (game.canvasNext.width - s[0].length * game.BLOCK_SIZE) / 2;
	// const dy = (game.canvasNext.height - s.length * game.BLOCK_SIZE) / 2;

	// ctx.translate(dx, dy);

	s.forEach((row, i) => row.forEach((cell, j) => {
		if (!cell) return;
		ctx.fillStyle = cell;
		ctx.beginPath();
		ctx.rect(
			j * game.BLOCK_SIZE,
			i * game.BLOCK_SIZE,
			game.BLOCK_SIZE,
			game.BLOCK_SIZE
		);
		ctx.fill();
		ctx.stroke();
	}));

	// ctx.translate(-dx, -dy);

	return game;
};


game.drawNext = function() {
	if (game.isStopped || game.isPaused) return game;
	window.requestAnimationFrame(game._drawNext);
	return game;
};


game.play = function() {
	if (game.isStopped || game.isPaused) return;
	return game
		.clear()
		.createPiece()
		.fall();
};


game.pause = function(force) {
	if (game.isStopped) return;
	if (!game.isPaused || force) {
		game.isPaused = true;
		clearTimeout(game._fallTimeout);
	} else {
		game.isPaused = false;
		game._fall();
	}
};


document.addEventListener('keydown', event => {
	switch (event.key) {
		case 'ArrowUp':
		case 'w':
			game.rotate(); break;
		case 'ArrowDown':
		case 's':
			game.moveDown(); break;
		case 'ArrowRight':
		case 'd':
			game.moveRight(); break;
		case 'ArrowLeft':
		case 'a':
			game.moveLeft(); break;
		case 'Escape':
			game.pause(); break;
		default: return;
	}

	event.preventDefault();
});


game.draw().drawNext().play();
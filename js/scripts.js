"use strict";

// =========================
// CHESS ENGINE - CORRECTED VERSION
// =========================

const DEBUG = false;

let pieces = [];
let boardSquares = [];
let selectedSquare = null;
let turn = 1;

// =========================
// HELPERS
// =========================

function log(...msg) {
    if (DEBUG) console.log(...msg);
}

function inBounds(x, y) {
    return x >= 1 && x <= 8 && y >= 1 && y <= 8;
}

function getSquare(x, y) {
    if (!inBounds(x, y)) return null;
    return boardSquares[(y - 1) * 8 + (x - 1)];
}

function safeText(id, text) {
    document.getElementById(id).textContent = text;
}

// =========================
// PLAYER
// =========================

function Player(color) {
    this.color = color;
    this.checked = false;
    this.castled = false;
    this.king = null;
    this.kingMoved = false;
    this.promote = null;
}

const white = new Player("white");
const black = new Player("black");

let currentPlayer = white;

// =========================
// SQUARE
// =========================

function SquareObject(x, y, color, selected, element, piece) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.selected = selected;
    this.element = element;
    this.piece = piece;
}

SquareObject.prototype.setPiece = function(piece) {
    this.piece = piece;
    this.update();
};

SquareObject.prototype.unsetPiece = function() {
    this.piece = null;
    this.update();
};

SquareObject.prototype.hasPiece = function() {
    return this.piece !== null;
};

SquareObject.prototype.select = function() {
    this.selected = true;
    this.update();
};

SquareObject.prototype.deselect = function() {
    this.selected = false;
    this.update();
};

SquareObject.prototype.update = function() {
    this.element.className = "square";
    this.element.classList.add(this.color);

    if (this.selected) {
        this.element.classList.add("selected");
    }

    if (this.piece === null) {
        this.element.classList.add("empty");
    } else {
        this.element.classList.add(this.piece.color + "-" + this.piece.type);
    }
};

// =========================
// PIECE BASE CLASS
// =========================

function Piece(x, y, color, type) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.type = type;
    this.captured = false;
    this.lastMoved = 0;
}

Piece.prototype.capture = function() {
    this.captured = true;
};

// =========================
// ROOK
// =========================

function Castle(x, y, color) {
    Piece.call(this, x, y, color, "castle");
}

Castle.prototype = Object.create(Piece.prototype);

Castle.prototype.isValidMove = function(toSquare) {

    let movementY = toSquare.y - this.y;
    let movementX = toSquare.x - this.x;

    let result = {
        valid: false,
        capture: null
    };

    if (!(movementX === 0 || movementY === 0)) {
        return result;
    }

    let directionX = movementX === 0 ? 0 : movementX / Math.abs(movementX);
    let directionY = movementY === 0 ? 0 : movementY / Math.abs(movementY);

    for (
        let x = this.x + directionX,
        y = this.y + directionY;
        x !== toSquare.x || y !== toSquare.y;
        x += directionX, y += directionY
    ) {
        let testSquare = getSquare(x, y);

        if (testSquare.hasPiece()) {
            return result;
        }
    }

    if (!toSquare.hasPiece()) {
        result.valid = true;
    }
    else if (toSquare.piece.color !== this.color) {
        result.valid = true;
        result.capture = toSquare;
    }

    return result;
};

// =========================
// KNIGHT
// =========================

function Knight(x, y, color) {
    Piece.call(this, x, y, color, "knight");
}

Knight.prototype = Object.create(Piece.prototype);

Knight.prototype.isValidMove = function(toSquare) {

    let movementY = Math.abs(toSquare.y - this.y);
    let movementX = Math.abs(toSquare.x - this.x);

    let result = {
        valid: false,
        capture: null
    };

    if (!(
        (movementX === 2 && movementY === 1) ||
        (movementX === 1 && movementY === 2)
    )) {
        return result;
    }

    if (!toSquare.hasPiece()) {
        result.valid = true;
    }
    else if (toSquare.piece.color !== this.color) {
        result.valid = true;
        result.capture = toSquare;
    }

    return result;
};

// =========================
// BISHOP
// =========================

function Bishop(x, y, color) {
    Piece.call(this, x, y, color, "bishop");
}

Bishop.prototype = Object.create(Piece.prototype);

Bishop.prototype.isValidMove = function(toSquare) {

    let movementY = toSquare.y - this.y;
    let movementX = toSquare.x - this.x;

    let result = {
        valid: false,
        capture: null
    };

    if (Math.abs(movementX) !== Math.abs(movementY)) {
        return result;
    }

    let directionX = movementX / Math.abs(movementX);
    let directionY = movementY / Math.abs(movementY);

    for (
        let x = this.x + directionX,
        y = this.y + directionY;
        x !== toSquare.x || y !== toSquare.y;
        x += directionX, y += directionY
    ) {
        let testSquare = getSquare(x, y);

        if (testSquare.hasPiece()) {
            return result;
        }
    }

    if (!toSquare.hasPiece()) {
        result.valid = true;
    }
    else if (toSquare.piece.color !== this.color) {
        result.valid = true;
        result.capture = toSquare;
    }

    return result;
};

// =========================
// QUEEN
// =========================

function Queen(x, y, color) {
    Piece.call(this, x, y, color, "queen");
}

Queen.prototype = Object.create(Piece.prototype);

Queen.prototype.isValidMove = function(toSquare) {

    let movementY = toSquare.y - this.y;
    let movementX = toSquare.x - this.x;

    let result = {
        valid: false,
        capture: null
    };

    let rookMove = movementX === 0 || movementY === 0;
    let bishopMove = Math.abs(movementX) === Math.abs(movementY);

    if (!(rookMove || bishopMove)) {
        return result;
    }

    let directionX = movementX === 0 ? 0 : movementX / Math.abs(movementX);
    let directionY = movementY === 0 ? 0 : movementY / Math.abs(movementY);

    for (
        let x = this.x + directionX,
        y = this.y + directionY;
        x !== toSquare.x || y !== toSquare.y;
        x += directionX, y += directionY
    ) {
        let testSquare = getSquare(x, y);

        if (testSquare.hasPiece()) {
            return result;
        }
    }

    if (!toSquare.hasPiece()) {
        result.valid = true;
    }
    else if (toSquare.piece.color !== this.color) {
        result.valid = true;
        result.capture = toSquare;
    }

    return result;
};

// =========================
// KING
// =========================

function King(x, y, color) {
    Piece.call(this, x, y, color, "king");
}

King.prototype = Object.create(Piece.prototype);

King.prototype.isValidMove = function(toSquare) {

    let movementY = Math.abs(toSquare.y - this.y);
    let movementX = Math.abs(toSquare.x - this.x);

    let result = {
        valid: false,
        capture: null
    };

    if (!(movementX <= 1 && movementY <= 1)) {
        return result;
    }

    if (!toSquare.hasPiece()) {
        result.valid = true;
    }
    else if (toSquare.piece.color !== this.color) {
        result.valid = true;
        result.capture = toSquare;
    }

    return result;
};

// =========================
// PAWN
// =========================

function Pawn(x, y, color) {
    Piece.call(this, x, y, color, "pawn");
    this.advancedTwo = 0;
}

Pawn.prototype = Object.create(Piece.prototype);

Pawn.prototype.isValidMove = function(toSquare) {

    let movementY = toSquare.y - this.y;
    let movementX = toSquare.x - this.x;

    let direction = this.color === "white" ? -1 : 1;

    let result = {
        valid: false,
        capture: null,
        promote: false
    };

    // move 2
    if (
        movementY === direction * 2 &&
        movementX === 0 &&
        this.y === (this.color === "white" ? 7 : 2)
    ) {

        if (
            !getSquare(this.x, this.y + direction).hasPiece() &&
            !toSquare.hasPiece()
        ) {
            result.valid = true;
            this.advancedTwo = turn;
        }
    }

    // move 1
    else if (movementY === direction) {

        // capture
        if (Math.abs(movementX) === 1) {

            if (
                toSquare.hasPiece() &&
                toSquare.piece.color !== this.color
            ) {
                result.valid = true;
                result.capture = toSquare;
            }
        }

        // forward
        else if (movementX === 0 && !toSquare.hasPiece()) {
            result.valid = true;
        }
    }

    // promotion
    if (
        result.valid &&
        (
            (this.color === "white" && toSquare.y === 1) ||
            (this.color === "black" && toSquare.y === 8)
        )
    ) {
        result.promote = true;
    }

    return result;
};

// =========================
// GAME SETUP
// =========================

function setup() {

    let boardContainer = document.getElementById("board");

    for (let y = 1; y <= 8; y++) {
        for (let x = 1; x <= 8; x++) {

            let squareElement = document.createElement("div");

            let color = (x + y) % 2 ? "dark" : "light";

            squareElement.addEventListener("click", squareClicked);

            squareElement.setAttribute("data-x", x);
            squareElement.setAttribute("data-y", y);

            let square = new SquareObject(
                x,
                y,
                color,
                false,
                squareElement,
                null
            );

            square.update();

            boardSquares.push(square);

            boardContainer.appendChild(squareElement);
        }
    }

    createPieces();
}

// =========================
// CREATE PIECES
// =========================

function createPieces() {

    white.king = new King(5, 8, "white");
    black.king = new King(5, 1, "black");

    pieces.push(white.king);
    pieces.push(black.king);

    // black
    pieces.push(new Castle(1, 1, "black"));
    pieces.push(new Knight(2, 1, "black"));
    pieces.push(new Bishop(3, 1, "black"));
    pieces.push(new Queen(4, 1, "black"));
    pieces.push(new Bishop(6, 1, "black"));
    pieces.push(new Knight(7, 1, "black"));
    pieces.push(new Castle(8, 1, "black"));

    for (let i = 1; i <= 8; i++) {
        pieces.push(new Pawn(i, 2, "black"));
    }

    // white
    for (let i = 1; i <= 8; i++) {
        pieces.push(new Pawn(i, 7, "white"));
    }

    pieces.push(new Castle(1, 8, "white"));
    pieces.push(new Knight(2, 8, "white"));
    pieces.push(new Bishop(3, 8, "white"));
    pieces.push(new Queen(4, 8, "white"));
    pieces.push(new Bishop(6, 8, "white"));
    pieces.push(new Knight(7, 8, "white"));
    pieces.push(new Castle(8, 8, "white"));

    for (let piece of pieces) {
        getSquare(piece.x, piece.y).setPiece(piece);
    }
}

// =========================
// CLICK HANDLER
// =========================

function squareClicked() {

    let x = Number(this.getAttribute("data-x"));
    let y = Number(this.getAttribute("data-y"));

    let square = getSquare(x, y);

    if (selectedSquare === null) {

        if (!square.hasPiece()) {
            showError("No piece here.");
            return;
        }

        if (square.piece.color !== currentPlayer.color) {
            showError("Not your piece.");
            return;
        }

        selectedSquare = square;
        selectedSquare.select();
    }

    else {

        if (selectedSquare === square) {
            selectedSquare.deselect();
            selectedSquare = null;
            return;
        }

        if (
            square.hasPiece() &&
            square.piece.color === currentPlayer.color
        ) {
            selectedSquare.deselect();
            selectedSquare = square;
            selectedSquare.select();
            return;
        }

        move(selectedSquare, square);
    }
}

// =========================
// MOVE PIECE
// =========================

function move(start, end) {

    let piece = start.piece;

    let moveResult = piece.isValidMove(end);

    if (!moveResult.valid) {
        showError("Invalid move.");
        return;
    }

    let capturedPiece = null;

    if (moveResult.capture !== null) {
        capturedPiece = moveResult.capture.piece;
        capturedPiece.capture();
        moveResult.capture.unsetPiece();
    }

    start.unsetPiece();

    piece.x = end.x;
    piece.y = end.y;

    end.setPiece(piece);

    if (kingExposed(currentPlayer.king)) {

        end.unsetPiece();

        piece.x = start.x;
        piece.y = start.y;

        start.setPiece(piece);

        if (capturedPiece !== null) {
            capturedPiece.captured = false;
            moveResult.capture.setPiece(capturedPiece);
        }

        showError("King exposed.");

        return;
    }

    start.deselect();
    selectedSquare = null;

    // promotion
    if (moveResult.promote) {
        currentPlayer.promote = piece;
        showPromotion(currentPlayer);
        return;
    }

    nextTurn();
}

// =========================
// KING CHECK
// =========================

function kingExposed(king) {

    for (let piece of pieces) {

        if (piece.captured) continue;

        if (piece.color === king.color) continue;

        let targetSquare = getSquare(king.x, king.y);

        if (piece.isValidMove(targetSquare).valid) {
            return true;
        }
    }

    return false;
}

// =========================
// TURN SYSTEM
// =========================

function nextTurn() {

    turn++;

    currentPlayer = currentPlayer === white ? black : white;

    document.getElementById("turnInfo").innerHTML =
        "Player's turn: <strong>" +
        (currentPlayer.color === "white" ? "White" : "Black") +
        "</strong>";
}

// =========================
// UI
// =========================

function showError(message) {
    safeText("errorText", message);
    document.getElementById("errorMessage").className = "overlay show";
}

function closeError() {
    document.getElementById("errorMessage").className = "overlay";
}

function showPromotion(player) {
    document.getElementById("promotionMessage").className = "overlay show";
    document.getElementById("promotionList").className = player.color;
}

function closePromotion() {
    document.getElementById("promotionMessage").className = "overlay";
}

// =========================
// PROMOTION
// =========================

function promote(type) {

    let oldPiece = currentPlayer.promote;

    let newPiece = null;

    switch (type) {

        case "queen":
            newPiece = new Queen(oldPiece.x, oldPiece.y, oldPiece.color);
            break;

        case "castle":
            newPiece = new Castle(oldPiece.x, oldPiece.y, oldPiece.color);
            break;

        case "bishop":
            newPiece = new Bishop(oldPiece.x, oldPiece.y, oldPiece.color);
            break;

        case "knight":
            newPiece = new Knight(oldPiece.x, oldPiece.y, oldPiece.color);
            break;
    }

    let index = pieces.indexOf(oldPiece);

    if (index !== -1) {

        getSquare(oldPiece.x, oldPiece.y).unsetPiece();

        pieces[index] = newPiece;

        getSquare(newPiece.x, newPiece.y).setPiece(newPiece);

        currentPlayer.promote = null;

        closePromotion();

        nextTurn();
    }
}

// =========================
// RESET GAME
// =========================

function newGame() {
    location.reload();
}

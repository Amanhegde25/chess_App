/**
 * ChessBoard.js — Interactive chess board with tap-to-move.
 *
 * Renders an 8×8 grid using React Native Views with Unicode chess pieces.
 * Interaction is tap-based:
 *   1. Tap a piece of your color to select it
 *   2. Legal move target squares highlight in green
 *   3. Tap a target square to make the move
 *   4. After each valid move, the store triggers engine evaluation
 *
 * The board orientation is always from the player's perspective.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Chess } from 'chess.js';
import useGameStore from '../store/useGameStore';

// ── Unicode piece map ─────────────────────────────────────────────────
const PIECE_UNICODE = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

// ── Board colors ──────────────────────────────────────────────────────
const LIGHT_SQUARE = '#F0D9B5';
const DARK_SQUARE = '#B58863';
const SELECTED_COLOR = 'rgba(255, 255, 100, 0.6)';
const LEGAL_MOVE_COLOR = 'rgba(100, 200, 100, 0.5)';
const LAST_MOVE_COLOR = 'rgba(155, 199, 0, 0.41)';

// ── Coordinate helpers ────────────────────────────────────────────────
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/**
 * Convert row/col to algebraic notation (e.g., 0,0 → 'a8')
 */
function toSquare(row, col, flipped) {
  const actualRow = flipped ? 7 - row : row;
  const actualCol = flipped ? 7 - col : col;
  return FILES[actualCol] + RANKS[actualRow];
}

export default function ChessBoard() {
  const [selectedSquare, setSelectedSquare] = useState(null);

  // Store subscriptions
  const fen = useGameStore((s) => s.fen);
  const chess = useGameStore((s) => s.chess);
  const playerColor = useGameStore((s) => s.playerColor);
  const makeMove = useGameStore((s) => s.makeMove);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const lastMove = useGameStore((s) => s.lastMove);

  // Board is flipped if player is black
  const flipped = playerColor === 'b';

  // Calculate board size (fit to screen width with some padding)
  const screenWidth = Dimensions.get('window').width;
  const boardSize = Math.min(screenWidth - 32, 400);
  const squareSize = boardSize / 8;

  /**
   * Get the piece at a given square from the chess.js instance.
   * Returns { type: 'p', color: 'w' } or null
   */
  const getPiece = useCallback(
    (square) => {
      if (!chess) return null;
      return chess.get(square);
    },
    [chess]
  );

  /**
   * Get legal moves for the selected piece.
   * Returns an array of target squares.
   */
  const legalMoves = useMemo(() => {
    if (!selectedSquare || !chess) return [];
    const moves = chess.moves({ square: selectedSquare, verbose: true });
    return moves.map((m) => m.to);
  }, [selectedSquare, chess]);

  /**
   * Handle a square tap.
   * - If no piece is selected and the tapped square has a friendly piece → select it
   * - If a piece is selected and the tap is a legal target → make the move
   * - Otherwise → deselect
   */
  const handleSquareTap = useCallback(
    (square) => {
      if (sessionStatus !== 'active') return;

      const piece = getPiece(square);

      // If we have a selected piece and the tap is a legal move target
      if (selectedSquare && legalMoves.includes(square)) {
        const move = makeMove(selectedSquare, square);
        if (move) {
          setSelectedSquare(null);
          return;
        }
      }

      // If tapped square has a piece of the player's color → select it
      // Allow selection only on the player's turn
      if (piece && piece.color === playerColor && chess.turn() === playerColor) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, legalMoves, getPiece, makeMove, playerColor, chess, sessionStatus]
  );

  /**
   * Render a single square.
   */
  const renderSquare = useCallback(
    (row, col) => {
      const square = toSquare(row, col, flipped);
      const isLight = (row + col) % 2 === 0;
      const piece = getPiece(square);

      // Determine square background color
      let backgroundColor = isLight ? LIGHT_SQUARE : DARK_SQUARE;

      if (square === selectedSquare) {
        backgroundColor = SELECTED_COLOR;
      } else if (legalMoves.includes(square)) {
        backgroundColor = LEGAL_MOVE_COLOR;
      } else if (lastMove && (square === lastMove.from || square === lastMove.to)) {
        backgroundColor = LAST_MOVE_COLOR;
      }

      // Get Unicode piece character
      const pieceKey = piece ? piece.color + piece.type : null;
      const pieceChar = pieceKey ? PIECE_UNICODE[pieceKey] : null;

      return (
        <TouchableOpacity
          key={square}
          onPress={() => handleSquareTap(square)}
          activeOpacity={0.7}
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              backgroundColor,
            },
          ]}
        >
          {/* Legal move dot indicator (for empty squares) */}
          {legalMoves.includes(square) && !piece && (
            <View style={styles.legalMoveDot} />
          )}

          {/* Piece */}
          {pieceChar && (
            <Text
              style={[
                styles.piece,
                {
                  fontSize: squareSize * 0.65,
                  color: piece.color === 'w' ? '#FFFFFF' : '#1a1a1a',
                  textShadowColor:
                    piece.color === 'w'
                      ? 'rgba(0,0,0,0.5)'
                      : 'rgba(255,255,255,0.5)',
                },
              ]}
            >
              {pieceChar}
            </Text>
          )}

          {/* Coordinate labels */}
          {col === 0 && (
            <Text style={[styles.rankLabel, { color: isLight ? DARK_SQUARE : LIGHT_SQUARE }]}>
              {RANKS[flipped ? 7 - row : row]}
            </Text>
          )}
          {row === 7 && (
            <Text style={[styles.fileLabel, { color: isLight ? DARK_SQUARE : LIGHT_SQUARE }]}>
              {FILES[flipped ? 7 - col : col]}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [flipped, getPiece, selectedSquare, legalMoves, lastMove, handleSquareTap, squareSize]
  );

  /**
   * Render the full 8×8 board.
   */
  const renderBoard = () => {
    const rows = [];
    for (let row = 0; row < 8; row++) {
      const squares = [];
      for (let col = 0; col < 8; col++) {
        squares.push(renderSquare(row, col));
      }
      rows.push(
        <View key={row} style={styles.row}>
          {squares}
        </View>
      );
    }
    return rows;
  };

  if (!fen || !chess) return null;

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {renderBoard()}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  piece: {
    fontWeight: '400',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  legalMoveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  rankLabel: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.7,
  },
  fileLabel: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.7,
  },
});

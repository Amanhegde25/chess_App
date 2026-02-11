/**
 * useGameStore.js — Central Zustand store for the chess reel prototype.
 *
 * Manages three core slices:
 *   1. liveGameState  — current FEN, chess.js instance, move history
 *   2. evaluationState — latest Stockfish score, status classification
 *   3. sessionStatus   — overall session lifecycle (idle → active → ended)
 *
 * The store is the single source of truth consumed by every component.
 */

import { create } from 'zustand';
import { Chess } from 'chess.js';

// ── Evaluation thresholds (in pawns, from the session player's perspective) ──
export const WARNING_THRESHOLD = -0.8;
export const FAIL_THRESHOLD = -1.5;

/**
 * Classify a raw evaluation score into a status label.
 * @param {number} score — evaluation in pawns (positive = good for player)
 * @returns {'safe' | 'warning' | 'fail'}
 */
export function classifyEval(score) {
  if (score <= FAIL_THRESHOLD) return 'fail';
  if (score <= WARNING_THRESHOLD) return 'warning';
  return 'safe';
}

const useGameStore = create((set, get) => ({
  // ─── Live Game State ───────────────────────────────────────────────
  fen: null,                 // Current FEN string
  chess: null,               // chess.js instance
  moveHistory: [],           // Array of SAN moves played during session
  lastMove: null,             // { from, to } of the most recent move (user or bot)
  suggestedMove: null,        // Best move suggestion for the player (UCI string)
  playerColor: 'w',          // The color the user plays as

  // ─── Evaluation State ──────────────────────────────────────────────
  evaluation: 0,             // Latest engine eval in pawns
  evalStatus: 'safe',        // 'safe' | 'warning' | 'fail'
  isEvaluating: false,       // True while engine is computing
  isBotThinking: false,      // True while bot is computing its response

  // ─── Session Status ────────────────────────────────────────────────
  sessionStatus: 'idle',     // 'idle' | 'active' | 'ended'
  isReelPaused: false,       // Controls reel playback

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Start a new interactive session from a FEN position.
   * Called when the reel pauses at the trigger timestamp.
   */
  startSession: (fen, playerColor = 'w') => {
    const chess = new Chess(fen);
    set({
      fen,
      chess,
      moveHistory: [],
      playerColor,
      evaluation: 0,
      evalStatus: 'safe',
      isEvaluating: true,  // Evaluate the starting position immediately
      isBotThinking: false,
      sessionStatus: 'active',
      isReelPaused: true,
    });
  },

  /**
   * Apply a move on the board. Returns the move object if legal, null otherwise.
   * After a successful move, the FEN is updated and engine evaluation is requested.
   */
  makeMove: (from, to) => {
    const { chess } = get();
    if (!chess) return null;

    // Attempt the move (auto-promotes to queen for simplicity)
    const move = chess.move({ from, to, promotion: 'q' });
    if (!move) return null;

    set({
      fen: chess.fen(),
      moveHistory: [...get().moveHistory, move.san],
      lastMove: { from, to },
      isEvaluating: true, // Signal that evaluation should begin
    });

    return move;
  },

  /**
   * Play the bot's (opponent's) response move using Stockfish's bestMove.
   * Called by EngineService after evaluation returns a bestMove string.
   * @param {string} bestMove — UCI move string like 'e2e4' or 'g1f3'
   */
  makeBotMove: (bestMove) => {
    const { chess, sessionStatus } = get();
    if (!chess || sessionStatus !== 'active' || !bestMove) return;

    // Parse UCI move format (e.g. 'e2e4' → from:'e2', to:'e4')
    const from = bestMove.substring(0, 2);
    const to = bestMove.substring(2, 4);
    const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

    const move = chess.move({ from, to, promotion: promotion || 'q' });
    if (!move) {
      console.warn('[Bot] Move failed:', bestMove);
      set({ isBotThinking: false });
      return;
    }

    console.log(`[Bot] Played: ${move.san} (${from}→${to})`);

    set({
      fen: chess.fen(),
      moveHistory: [...get().moveHistory, move.san],
      lastMove: { from, to },
      isBotThinking: false,
      isEvaluating: true, // Re-evaluate after bot move to get next suggestion
    });
  },

  /**
   * Called by the engine service after Stockfish returns an evaluation.
   * Classifies the score and triggers session end if below FAIL_THRESHOLD.
   * Also triggers bot's response move if it's the opponent's turn.
   */
  updateEvaluation: (score, bestMove) => {
    const { playerColor, chess } = get();
    const status = classifyEval(score);

    // If it's the player's turn, bestMove is the suggestion for the player
    const isPlayerTurn = chess && chess.turn() === playerColor;
    const newSuggested = isPlayerTurn ? bestMove : null;
    if (newSuggested) {
      console.log(`[Engine] Suggested best move for you: ${newSuggested}`);
    }

    set({
      evaluation: score,
      evalStatus: status,
      isEvaluating: false,
      suggestedMove: newSuggested,
    });

    // If evaluation collapses, end the session
    if (status === 'fail') {
      setTimeout(() => {
        get().endSession();
      }, 1200);
      return;
    }

    // If it's now the opponent's turn, play the bot's best move
    if (chess && chess.turn() !== playerColor && bestMove) {
      set({ isBotThinking: true });
      // Small delay to make the bot feel natural
      setTimeout(() => {
        get().makeBotMove(bestMove);
      }, 500);
    }
  },

  /**
   * End the interactive session and signal the reel to resume.
   */
  endSession: () => {
    set({
      sessionStatus: 'ended',
      isReelPaused: false, // Reel will resume
    });
  },

  /**
   * Reset everything back to idle (called after reel resumes).
   */
  resetSession: () => {
    set({
      fen: null,
      chess: null,
      moveHistory: [],
      lastMove: null,
      evaluation: 0,
      evalStatus: 'safe',
      isEvaluating: false,
      isBotThinking: false,
      sessionStatus: 'idle',
      isReelPaused: false,
    });
  },
}));

export default useGameStore;

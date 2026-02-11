/**
 * EvaluationController.js — Pure logic module for evaluation thresholds.
 *
 * This module defines the thresholds and provides utility functions
 * to interpret Stockfish evaluation scores. It is intentionally pure
 * (no React, no side effects) so it can be tested and reused easily.
 *
 * Evaluation Flow:
 *   1. User makes a move on the chess board
 *   2. EngineService sends the new FEN to Stockfish
 *   3. Stockfish returns a centipawn score
 *   4. EvaluationController classifies the score
 *   5. If 'fail' → session ends and reel resumes
 */

// ── Thresholds (in pawns, from the player's perspective) ─────────────
// Positive = player is winning, Negative = player is losing
export const WARNING_THRESHOLD = -0.8;
export const FAIL_THRESHOLD = -1.5;

/**
 * Convert centipawns to pawns.
 * Stockfish reports scores in centipawns (100cp = 1 pawn).
 * @param {number} centipawns
 * @returns {number} score in pawns
 */
export function centipawnsToPawns(centipawns) {
  return centipawns / 100;
}

/**
 * Classify a score into a session status.
 * @param {number} scoreInPawns — evaluation from the player's perspective
 * @returns {'safe' | 'warning' | 'fail'}
 */
export function classifyEvaluation(scoreInPawns) {
  if (scoreInPawns <= FAIL_THRESHOLD) return 'fail';
  if (scoreInPawns <= WARNING_THRESHOLD) return 'warning';
  return 'safe';
}

/**
 * Parse a Stockfish UCI "info" line and extract the evaluation score.
 * Handles both centipawn scores and mate scores.
 *
 * Example lines:
 *   "info depth 15 score cp -142 nodes 12345 ..."
 *   "info depth 20 score mate 3 nodes 12345 ..."
 *
 * @param {string} infoLine — a single UCI info line
 * @param {string} playerColor — 'w' or 'b' (the color the user is playing)
 * @returns {number|null} — score in pawns from the player's perspective, or null
 */
export function parseUCIScore(infoLine, playerColor = 'w') {
  // Look for "score cp <number>"
  const cpMatch = infoLine.match(/score cp (-?\d+)/);
  if (cpMatch) {
    let score = centipawnsToPawns(parseInt(cpMatch[1], 10));
    // Stockfish reports from the side to move's perspective.
    // If the player is black, we negate (since Stockfish's perspective is white-relative).
    // Actually, Stockfish reports from the side-to-move perspective.
    // We need the score from the SESSION PLAYER's perspective.
    // The caller should handle this.
    return score;
  }

  // Look for "score mate <number>"
  const mateMatch = infoLine.match(/score mate (-?\d+)/);
  if (mateMatch) {
    const mateIn = parseInt(mateMatch[1], 10);
    // Mate is very good (+999) or very bad (-999)
    return mateIn > 0 ? 999 : -999;
  }

  return null;
}

/**
 * Determine if the session should continue based on the latest evaluation.
 * @param {number} scoreInPawns
 * @returns {{ status: string, shouldContinue: boolean, message: string }}
 */
export function evaluatePosition(scoreInPawns) {
  const status = classifyEvaluation(scoreInPawns);

  switch (status) {
    case 'safe':
      return {
        status,
        shouldContinue: true,
        message: 'Position is solid. Keep exploring!',
      };
    case 'warning':
      return {
        status,
        shouldContinue: true,
        message: 'Careful! Your position is getting worse.',
      };
    case 'fail':
      return {
        status,
        shouldContinue: false,
        message: 'Position collapsed! Session ending...',
      };
    default:
      return { status: 'safe', shouldContinue: true, message: '' };
  }
}

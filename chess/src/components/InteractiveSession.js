/**
 * InteractiveSession.js — Chess session overlay.
 *
 * This component is the full-screen modal that appears when a chess session
 * is active. It contains:
 *   - The ChessBoard component
 *   - An evaluation bar showing the current Stockfish score
 *   - Status indicator (safe / warning / fail)
 *   - Move history
 *   - Manual exit button
 *
 * Session End Flow:
 *   1. Player makes a blunder → eval drops below -1.5
 *   2. Store sets evalStatus to 'fail'
 *   3. This component shows "Position Collapsed!" message
 *   4. After 1.2s delay, store calls endSession()
 *   5. sessionStatus changes to 'ended'
 *   6. This component animates out
 *   7. ReelPlayer detects 'ended' and resumes playback
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import ChessBoard from './ChessBoard';
import useGameStore from '../store/useGameStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Evaluation bar component — visual indicator of the engine score.
 */
function EvalBar({ evaluation, evalStatus }) {
  // Map evaluation to a 0–100% fill (50% = equal, 100% = winning, 0% = losing)
  // Clamp to [-5, 5] pawn range for display
  const clampedEval = Math.max(-5, Math.min(5, evaluation));
  const fillPercent = ((clampedEval + 5) / 10) * 100;

  const barColor =
    evalStatus === 'fail'
      ? '#FF4444'
      : evalStatus === 'warning'
      ? '#FFaa00'
      : '#44DD88';

  return (
    <View style={styles.evalBarContainer}>
      <View style={styles.evalBarTrack}>
        <Animated.View
          style={[
            styles.evalBarFill,
            {
              width: `${fillPercent}%`,
              backgroundColor: barColor,
            },
          ]}
        />
        <View style={styles.evalBarCenter} />
      </View>
      <Text style={[styles.evalScore, { color: barColor }]}>
        {evaluation >= 0 ? '+' : ''}
        {evaluation.toFixed(1)}
      </Text>
    </View>
  );
}

/**
 * Status badge — shows the current session status.
 */
function StatusBadge({ evalStatus, isEvaluating, isBotThinking }) {
  const config = {
    safe: { label: '✓ SAFE', bg: '#1a3d2a', color: '#44DD88', border: '#2d6b44' },
    warning: { label: '⚠ CAUTION', bg: '#3d3a1a', color: '#FFaa00', border: '#6b5d2d' },
    fail: { label: '✕ COLLAPSED', bg: '#3d1a1a', color: '#FF4444', border: '#6b2d2d' },
  };

  const { label, bg, color, border } = config[evalStatus] || config.safe;

  let displayLabel = label;
  if (isBotThinking) displayLabel = '🤖 BOT THINKING...';
  else if (isEvaluating) displayLabel = '⟳ ANALYZING...';

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.statusText, { color }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

export default function InteractiveSession() {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Store subscriptions
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const evaluation = useGameStore((s) => s.evaluation);
  const evalStatus = useGameStore((s) => s.evalStatus);
  const isEvaluating = useGameStore((s) => s.isEvaluating);
  const isBotThinking = useGameStore((s) => s.isBotThinking);
  const moveHistory = useGameStore((s) => s.moveHistory);
  const endSession = useGameStore((s) => s.endSession);
  const fen = useGameStore((s) => s.fen);
  const suggestedMove = useGameStore((s) => s.suggestedMove);

  /**
   * Animate in when session becomes active, out when ended.
   */
  useEffect(() => {
    if (sessionStatus === 'active') {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (sessionStatus === 'ended') {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sessionStatus, slideAnim, fadeAnim]);

  // Don't render when idle
  if (sessionStatus === 'idle') return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.sessionContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>♟ Interactive Session</Text>
            <Text style={styles.headerSubtitle}>Explore the position freely</Text>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={endSession}>
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Evaluation Bar */}
        <EvalBar evaluation={evaluation} evalStatus={evalStatus} />

        {/* Status Badge */}
        <StatusBadge evalStatus={evalStatus} isEvaluating={isEvaluating} isBotThinking={isBotThinking} />

        {/* Fail Message */}
        {evalStatus === 'fail' && (
          <View style={styles.failMessage}>
            <Text style={styles.failIcon}>💥</Text>
            <Text style={styles.failText}>Position Collapsed!</Text>
            <Text style={styles.failSubtext}>Evaluation dropped below threshold. Session ending...</Text>
          </View>
        )}

        {/* Warning Message */}
        {evalStatus === 'warning' && (
          <View style={styles.warningMessage}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>Careful! Position getting worse.</Text>
          </View>
        )}

        {/* Chess Board */}
        <View style={styles.boardContainer}>
          <ChessBoard />
        </View>

        {/* Best Move Suggestion */}
        {suggestedMove && (
          <View style={styles.suggestedMove}>
            <Text style={styles.suggestedLabel}>💡 Best move:</Text>
            <Text style={styles.suggestedText}>
              {suggestedMove.substring(0, 2)} → {suggestedMove.substring(2, 4)}
            </Text>
          </View>
        )}

        {/* Move History */}
        {moveHistory.length > 0 && (
          <View style={styles.moveHistoryContainer}>
            <Text style={styles.moveHistoryLabel}>Moves:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.moveHistoryList}>
                {moveHistory.map((move, i) => (
                  <View key={i} style={styles.moveBadge}>
                    <Text style={styles.moveNumber}>{i + 1}.</Text>
                    <Text style={styles.moveText}>{move}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Evaluation info */}
        <View style={styles.evalInfo}>
          <Text style={styles.evalInfoText}>
            Warning: {' < '}-0.8 · Fail: {' < '}-1.5
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 100,
  },
  sessionContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Eval Bar ──
  evalBarContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  evalBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#2a2a3a',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  evalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  evalBarCenter: {
    position: 'absolute',
    left: '50%',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  evalScore: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
    minWidth: 50,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  // ── Status Badge ──
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // ── Fail / Warning Messages ──
  failMessage: {
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    width: '100%',
  },
  failIcon: {
    fontSize: 24,
  },
  failText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  failSubtext: {
    color: '#FF8888',
    fontSize: 12,
    marginTop: 2,
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
    marginBottom: 8,
    width: '100%',
  },
  warningIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  warningText: {
    color: '#FFaa00',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Board ──
  boardContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },

  // ── Move History ──
  moveHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  moveHistoryLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  moveHistoryList: {
    flexDirection: 'row',
    gap: 6,
  },
  moveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  moveNumber: {
    color: '#666',
    fontSize: 12,
    marginRight: 3,
  },
  moveText: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Eval Info ──
  evalInfo: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  evalInfoText: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
  },

  // ── Suggested Move ──
  suggestedMove: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 180, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100, 180, 255, 0.3)',
    marginTop: 8,
  },
  suggestedLabel: {
    color: '#88bbff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  suggestedText: {
    color: '#aaddff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

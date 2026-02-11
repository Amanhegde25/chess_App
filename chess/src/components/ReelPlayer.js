/**
 * ReelPlayer.js — Vertical video reel player using expo-video.
 *
 * This component renders a full-screen vertical video player that:
 *   1. Plays a chess reel video automatically
 *   2. Monitors playback progress
 *   3. Pauses at a predefined trigger timestamp
 *   4. Launches the interactive chess session
 *   5. Resumes playback when the session ends
 *
 * The trigger timestamp and FEN are provided via reelData prop.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import useGameStore from '../store/useGameStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReelPlayer({ reelData }) {
  const {
    videoUri,
    triggerTimestamp,
    fen,
    playerColor = 'w',
    title = 'Chess Reel',
    description = 'Watch and learn!',
  } = reelData;

  const [hasTriggered, setHasTriggered] = useState(false);
  const [showTriggerUI, setShowTriggerUI] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Store subscriptions
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const isReelPaused = useGameStore((s) => s.isReelPaused);
  const startSession = useGameStore((s) => s.startSession);
  const resetSession = useGameStore((s) => s.resetSession);

  // Create the video player
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  /**
   * Monitor playback time and trigger pause at the designated timestamp.
   * Uses polling since expo-video's event model is event-based.
   */
  useEffect(() => {
    if (hasTriggered) return;

    const interval = setInterval(() => {
      if (player && player.currentTime >= triggerTimestamp && !hasTriggered) {
        player.pause();
        setHasTriggered(true);
        setShowTriggerUI(true);

        // Start pulse animation on the CTA button
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }, 200); // Check every 200ms

    return () => clearInterval(interval);
  }, [player, triggerTimestamp, hasTriggered, pulseAnim]);

  /**
   * When session ends, resume the reel.
   */
  useEffect(() => {
    if (sessionStatus === 'ended') {
      // Small delay for UX, then resume
      const timeout = setTimeout(() => {
        setShowTriggerUI(false);
        if (player) {
          player.play();
        }
        // Reset session state after reel resumes
        setTimeout(() => resetSession(), 500);
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [sessionStatus, player, resetSession]);

  /**
   * User taps the "Start Challenge" button → launch the chess session.
   */
  const handleStartSession = useCallback(() => {
    setShowTriggerUI(false);
    startSession(fen, playerColor);
  }, [fen, playerColor, startSession]);

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Video overlay gradient */}
      <View style={styles.gradient} />

      {/* Reel info overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressTrigger,
              { left: `${(triggerTimestamp / 30) * 100}%` }, // Approximate
            ]}
          />
        </View>
      </View>

      {/* Trigger UI — "Start Challenge" button */}
      {showTriggerUI && (
        <View style={styles.triggerOverlay}>
          <View style={styles.triggerCard}>
            <Text style={styles.triggerIcon}>♟</Text>
            <Text style={styles.triggerTitle}>Interactive Challenge!</Text>
            <Text style={styles.triggerSubtitle}>
              Can you find the best continuation?
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.triggerButton}
                onPress={handleStartSession}
                activeOpacity={0.8}
              >
                <Text style={styles.triggerButtonText}>⚔ Start Challenge</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      )}

      {/* Paused indicator */}
      {isReelPaused && !showTriggerUI && sessionStatus === 'active' && (
        <View style={styles.pausedBadge}>
          <Text style={styles.pausedText}>⏸ REEL PAUSED</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'transparent',
    // Simulated gradient via multiple layers
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 80,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  progressTrigger: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },

  // ── Trigger UI ──
  triggerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  triggerCard: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    width: SCREEN_WIDTH * 0.85,
  },
  triggerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  triggerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  triggerSubtitle: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  triggerButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  triggerButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Paused Badge ──
  pausedBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pausedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

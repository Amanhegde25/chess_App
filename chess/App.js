/**
 * App.js — Main entry point for the Chess Reel Prototype.
 *
 * Composes the full UX flow:
 *   1. ReelPlayer — Full-screen vertical video reel
 *   2. InteractiveSession — Chess board overlay (appears when triggered)
 *   3. EngineService — Hidden Stockfish WebView (active during sessions)
 *
 * Sample reel data is defined below with a trigger timestamp and FEN position.
 * Replace the videoUri with your actual chess reel content.
 *
 * UX Flow:
 *   Play reel → pause at trigger → open chess board →
 *   explore moves → engine evaluates → eval collapses →
 *   session ends → reel resumes
 */

import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import ReelPlayer from './src/components/ReelPlayer';
import InteractiveSession from './src/components/InteractiveSession';
import EngineService from './src/services/EngineService';

// ── Sample Reel Data ──────────────────────────────────────────────────
// This is the metadata that would come from a backend in production.
// For the prototype, we define it statically.
const REEL_DATA = {
  // Sample video — replace with your actual chess reel video
  videoUri:
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',

  // Timestamp (in seconds) where the reel should pause
  triggerTimestamp: 10,

  // FEN position to load when the interactive session begins
  // This is a common position from the Italian Game (after 1.e4 e5 2.Nf3 Nc6 3.Bc4)
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',

  // The color the user plays as in the interactive session
  playerColor: 'b',

  // Reel overlay info
  title: '🎯 Italian Game Trap',
  description: 'Black to move — can you survive the position?',
};

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Layer 1: Video Reel (background) */}
      <ReelPlayer reelData={REEL_DATA} />

      {/* Layer 2: Interactive Chess Session (modal overlay) */}
      <InteractiveSession />

      {/* Layer 3: Hidden Stockfish Engine (zero UI) */}
      <EngineService />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

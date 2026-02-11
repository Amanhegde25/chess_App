/**
 * EngineService.js — Stockfish engine integration via hidden WebView.
 *
 * Architecture:
 *   Renders a hidden WebView that loads an inline HTML page.
 *   The HTML loads stockfish.js from the local Metro dev server's public/ dir,
 *   runs it inline (no Worker needed), and communicates back via postMessage.
 *
 * Evaluation Flow:
 *   1. Player makes a move → store.fen updates, store.isEvaluating = true
 *   2. This component detects the change and sends { type: 'evaluate', fen }
 *   3. WebView/Stockfish processes and returns { type: 'eval', score, depth }
 *   4. This component calls store.updateEvaluation(adjustedScore)
 *   5. Store classifies eval → if 'fail', session ends
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import useGameStore from '../store/useGameStore';

/**
 * Build the HTML for the Stockfish WebView.
 * 
 * stockfish.js is served from the public/ dir by Metro/Expo.
 * We fetch it as text → create Blob URL → spawn Worker.
 * Since both the HTML (via baseUrl) and the fetch target are on
 * the same Metro origin, there are ZERO CORS issues.
 */
function buildEngineHTML() {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body>
<script>
  var engine = null;
  var currentEval = null;
  var isReady = false;

  function sendToRN(data) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    } catch(e) {}
  }

  // Handle engine output lines (UCI protocol)
  function onEngineMessage(line) {
    if (typeof line !== 'string') return;

    if (line === 'uciok') {
      engine.postMessage('isready');
      return;
    }
    if (line === 'readyok') {
      isReady = true;
      sendToRN({ type: 'ready' });
      return;
    }

    // Parse eval info lines
    if (line.indexOf('info') === 0 && line.indexOf('score') > -1) {
      var dm = line.match(/depth (\\d+)/);
      var depth = dm ? parseInt(dm[1], 10) : 0;
      if (depth >= 8) {
        var score = null;
        var cp = line.match(/score cp (-?\\d+)/);
        if (cp) score = parseInt(cp[1], 10) / 100;
        var mt = line.match(/score mate (-?\\d+)/);
        if (mt) score = parseInt(mt[1], 10) > 0 ? 999 : -999;
        if (score !== null) currentEval = { score: score, depth: depth, raw: line };
      }
    }

    // Best move → send final result
    if (line.indexOf('bestmove') === 0) {
      var bm = line.match(/bestmove (\\S+)/);
      if (currentEval) {
        sendToRN({
          type: 'eval',
          score: currentEval.score,
          depth: currentEval.depth,
          bestMove: bm ? bm[1] : null
        });
      }
      currentEval = null;
    }
  }

  // Fetch stockfish.js locally (same-origin from Metro) → Blob → Worker
  async function initEngine() {
    sendToRN({ type: 'loading' });
    try {
      var res = await fetch('stockfish.js');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var text = await res.text();
      var blob = new Blob([text], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      engine = new Worker(url);

      engine.onmessage = function(e) {
        onEngineMessage(typeof e.data === 'string' ? e.data : '');
      };
      engine.onerror = function(e) {
        sendToRN({ type: 'error', message: 'Worker error: ' + (e.message || e) });
      };

      engine.postMessage('uci');
    } catch(err) {
      sendToRN({ type: 'error', message: 'Init failed: ' + err.message });
    }
  }

  // Handle messages from React Native
  function handleRNMessage(event) {
    var data;
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch(e) { return; }

    if (data.type === 'evaluate') {
      if (!engine || !isReady) {
        sendToRN({ type: 'error', message: 'Engine not ready' });
        return;
      }
      currentEval = null;
      engine.postMessage('stop');
      engine.postMessage('position fen ' + data.fen);
      engine.postMessage('go depth ' + (data.depth || 12));
    } else if (data.type === 'stop') {
      if (engine) engine.postMessage('stop');
    }
  }

  window.addEventListener('message', handleRNMessage);
  document.addEventListener('message', handleRNMessage);
  initEngine();
</script>
</body>
</html>`;
}

export default function EngineService() {
  const webViewRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);

  // Subscribe to store values
  const fen = useGameStore((s) => s.fen);
  const isEvaluating = useGameStore((s) => s.isEvaluating);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const playerColor = useGameStore((s) => s.playerColor);
  const chess = useGameStore((s) => s.chess);
  const updateEvaluation = useGameStore((s) => s.updateEvaluation);

  /**
   * Determine the base URL for the WebView.
   * In development, this is the Metro bundler URL.
   * The stockfish.js in public/ is served at this base URL.
   */
  const getBaseUrl = useCallback(() => {
    // Get the Metro dev server URL
    const debuggerHost =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      'localhost:8081';
    // Extract just the host (without path)
    const host = debuggerHost.split('/')[0];
    return `http://${host}`;
  }, []);

  /**
   * Send a message to the WebView.
   */
  const sendToEngine = useCallback((data) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, []);

  /**
   * Trigger evaluation when a move is made.
   */
  useEffect(() => {
    if (isEvaluating && engineReady && fen && sessionStatus === 'active') {
      sendToEngine({ type: 'evaluate', fen, depth: 12 });
    }
  }, [isEvaluating, fen, engineReady, sessionStatus, sendToEngine]);

  /**
   * Handle messages from the Stockfish WebView.
   */
  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'ready':
            setEngineReady(true);
            console.log('[EngineService] ✅ Stockfish engine ready (local)');
            break;

          case 'eval': {
            // Adjust score to the player's perspective
            let adjustedScore = data.score;
            if (chess) {
              const sideToMove = chess.turn();
              if (sideToMove !== playerColor) {
                adjustedScore = -data.score;
              }
            }
            console.log(
              `[EngineService] Eval: ${adjustedScore.toFixed(2)} (depth ${data.depth}, bestMove: ${data.bestMove})`
            );
            updateEvaluation(adjustedScore, data.bestMove);
            break;
          }

          case 'error':
            console.error('[EngineService] Error:', data.message);
            useGameStore.getState().isEvaluating &&
              useGameStore.setState({ isEvaluating: false });
            break;

          case 'loading':
            console.log('[EngineService] Loading stockfish...', data.method || '');
            break;
        }
      } catch (e) {
        console.error('[EngineService] Failed to parse message:', e);
      }
    },
    [chess, playerColor, updateEvaluation]
  );

  // Don't render the WebView when there's no active session
  if (sessionStatus === 'idle') return null;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: buildEngineHTML(), baseUrl: getBaseUrl() }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        style={styles.webview}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  webview: {
    width: 1,
    height: 1,
  },
});

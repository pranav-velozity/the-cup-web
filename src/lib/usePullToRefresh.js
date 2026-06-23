import { useRef, useState, useCallback } from "react";

// Lightweight pull-to-refresh for a scroll container. Attach `ref` to the
// scrollable element and spread `handlers` onto it; render the indicator using
// `pull` (px) and `refreshing`.
export function usePullToRefresh(onRefresh) {
  const ref = useRef(null);
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 64, MAX = 90;

  const onTouchStart = useCallback((e) => {
    startY.current = (ref.current?.scrollTop || 0) <= 0 && !refreshing ? e.touches[0].clientY : null;
  }, [refreshing]);

  const onTouchMove = useCallback((e) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    setPull(dy > 0 && (ref.current?.scrollTop || 0) <= 0 ? Math.min(dy * 0.5, MAX) : 0);
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh(); } catch { /* ignore */ }
      setRefreshing(false);
    }
    setPull(0);
  }, [pull, onRefresh]);

  return { ref, pull, refreshing, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}

// Inline indicator element to drop at the top of a pullable screen.
export function pullIndicatorStyle(pull, refreshing) {
  return {
    height: refreshing ? 38 : pull,
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", color: "#2E7D5B",
    transition: refreshing || pull === 0 ? "height .2s ease" : "none",
  };
}

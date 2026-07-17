import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  playUploadSuccess,
  playScanStart,
  playAnalysing,
  playResultSafe,
  playResultThreat,
  playButtonTap,
  playReset,
} from '../utils/sounds';

export function useSound() {
  const { isMuted } = useApp();

  const play = useCallback((soundFn) => {
    if (!isMuted) {
      return soundFn();
    }
    return undefined;
  }, [isMuted]);

  // Scanner result effects depend on this object. Memoising it prevents a
  // normal UI re-render from replaying a completion sound.
  return useMemo(() => ({
    uploadSuccess: () => play(playUploadSuccess),
    scanStart: () => play(playScanStart),
    analysing: () => play(playAnalysing),
    resultSafe: () => play(playResultSafe),
    resultThreat: () => play(playResultThreat),
    buttonTap: () => play(playButtonTap),
    reset: () => play(playReset),
    isMuted,
  }), [play, isMuted]);
}

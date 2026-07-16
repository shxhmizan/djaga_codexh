import { useCallback } from 'react';
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

  return {
    uploadSuccess: () => play(playUploadSuccess),
    scanStart: () => play(playScanStart),
    analysing: () => play(playAnalysing),
    resultSafe: () => play(playResultSafe),
    resultThreat: () => play(playResultThreat),
    buttonTap: () => play(playButtonTap),
    reset: () => play(playReset),
    isMuted,
  };
}

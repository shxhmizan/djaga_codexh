export const haptics = {
  tap: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },
  scan: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },
  safe: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },
  threat: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  },
  reset: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
};

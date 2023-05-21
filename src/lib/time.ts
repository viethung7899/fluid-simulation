const DELTA = 1 / 60;

export const useTime = () => {
  let lastUpdated = Date.now();

  return {
    getTimeStepInSeconds() {
      const now = Date.now();
      const delta = (now - lastUpdated) / 1000;
      lastUpdated = now;
      return Math.min(delta, DELTA);
    },
    get lastUpdateInSeconds() {
      return lastUpdated / 1000;
    }
  }
}
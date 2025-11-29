
export const visualEffects = {
  shake: 0
};

export const triggerShake = (intensity: number) => {
  // Keep the strongest shake if multiple triggers happen simultaneously
  visualEffects.shake = Math.max(visualEffects.shake, intensity);
};

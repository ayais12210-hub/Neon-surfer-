
// Shared mutable state for the virtual joystick
// We use this pattern to avoid React state updates in the main game loop (useFrame)
export const virtualJoystick = {
  x: 0,
  y: 0,
  active: false
};

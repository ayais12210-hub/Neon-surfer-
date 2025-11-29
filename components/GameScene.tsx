
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Player } from './Player';
import { Track } from './Track';
import { useGameStore } from '../store';
import { Mesh, Vector3 } from 'three';
import { audioManager } from '../audio';

export const GameScene: React.FC = () => {
  const { status, addScore, increaseSpeed, startGame, resetGame, tickPowerups } = useGameStore();
  const playerRef = useRef<any>(null); 
  const lastScoreUpdate = useRef(0);
  const lastGamepadInput = useRef(0);
  
  // Logic to simulate game progression
  useFrame((state, delta) => {
    if (status === 'playing') {
      tickPowerups(delta);
      
      lastScoreUpdate.current += delta;
      // Score based on speed and time
      if (lastScoreUpdate.current > 0.1) {
        addScore(Math.ceil(1 * (1 + delta))); 
        lastScoreUpdate.current = 0;
      }
      increaseSpeed();
    } else {
        // Gamepad Start/Reset Logic
        const gp = navigator.getGamepads()[0];
        if (gp) {
            const now = state.clock.elapsedTime;
            // Debounce start button
            if (now - lastGamepadInput.current > 0.5) {
                // Check if any button is pressed to start
                const anyPressed = gp.buttons.some(b => b.pressed);
                if (anyPressed) {
                    audioManager.init();
                    if (status === 'idle') startGame();
                    else if (status === 'gameover') startGame(); // Instant restart
                    // Note: We don't use gamepad to unpause to prevent accidental unpauses,
                    // but we could add it later.
                    lastGamepadInput.current = now;
                }
            }
        }
    }
  });

  return (
    <group>
      <Player ref={playerRef} />
      <Track playerRef={playerRef} />
      <Monster status={status} />
    </group>
  );
};

// The Glitch Monster that chases you (Temple Run style)
const Monster: React.FC<{ status: string }> = ({ status }) => {
  const meshRef = useRef<Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    if (status === 'paused') return;
    
    // Hover animation
    meshRef.current.position.y = 2 + Math.sin(state.clock.elapsedTime * 5) * 0.5;
    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.2;
    
    // Chasing logic
    const targetZ = status === 'playing' ? 4 : 2; // Falls back when playing, comes close when stopped
    meshRef.current.position.z += (targetZ - meshRef.current.position.z) * 0.05;
  });

  return (
    <group position={[0, 2, 8]}>
       <mesh ref={meshRef}>
         <sphereGeometry args={[1.5, 32, 32]} />
         <meshStandardMaterial 
            color="#000000" 
            emissive="#330000" 
            roughness={0.1} 
            metalness={0.9} 
            wireframe
         />
       </mesh>
       {/* Glowing Eyes */}
       <mesh position={[-0.5, 2.2, 5.5]} scale={[0.2, 0.2, 0.2]}>
          <pointLight distance={3} intensity={5} color="red" />
       </mesh>
    </group>
  );
};

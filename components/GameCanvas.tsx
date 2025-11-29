
import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import { GameScene } from './GameScene';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { useGameStore } from '../store';
import { Vector3, MathUtils } from 'three';
import { visualEffects } from '../effects';

const CameraController = () => {
    const { camera } = useThree();
    const basePos = new Vector3(0, 6, 9);
    
    useFrame((state, delta) => {
        if (visualEffects.shake > 0) {
             const intensity = visualEffects.shake;
             const rx = (Math.random() - 0.5) * intensity;
             const ry = (Math.random() - 0.5) * intensity;
             const rz = (Math.random() - 0.5) * intensity;
             
             camera.position.set(basePos.x + rx, basePos.y + ry, basePos.z + rz);
             
             // Decay shake
             visualEffects.shake = MathUtils.lerp(visualEffects.shake, 0, 10 * delta);
             if (visualEffects.shake < 0.01) visualEffects.shake = 0;
        } else {
             // Smoothly return to base if needed, or just set it
             camera.position.lerp(basePos, 5 * delta);
        }
    });
    return null;
}

export const GameCanvas: React.FC = () => {
  const gameId = useGameStore((state) => state.gameId);

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
      {/* Camera angle similar to Subway Surfers - high and angled down */}
      <PerspectiveCamera makeDefault position={[0, 6, 9]} fov={45} rotation={[-0.3, 0, 0]} />
      <CameraController />
      
      <color attach="background" args={['#020205']} />
      <fog attach="fog" args={['#020205', 10, 50]} />
      
      <Suspense fallback={null}>
        <ambientLight intensity={0.2} />
        {/* Dynamic lighting for the runner */}
        <spotLight 
          position={[0, 20, 10]} 
          angle={0.5} 
          penumbra={1} 
          intensity={2} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-10, 5, -10]} intensity={2} color="#00ffff" distance={30} />
        <pointLight position={[10, 5, -20]} intensity={2} color="#ff00ff" distance={30} />
        
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={2} />
        
        {/* Key forces remount on reset, fixing physics/state issues */}
        <GameScene key={gameId} />
        
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={1.2} />
          <ChromaticAberration offset={[0.002, 0.002]} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
};

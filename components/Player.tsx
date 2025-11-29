
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group, MathUtils } from 'three';
import { useGameStore } from '../store';
import { Lane, LANE_WIDTH, JUMP_DURATION, SLIDE_DURATION, CHARACTERS } from '../types';
import { Trail, RoundedBox, useTexture } from '@react-three/drei';
import { audioManager } from '../audio';
import { virtualJoystick } from '../controls';
import { triggerShake } from '../effects';

export const Player = forwardRef((props, ref) => {
  const group = useRef<Group>(null);
  const meshRef = useRef<Group>(null);
  const { status, activePowerups, selectedCharacterId } = useGameStore();
  
  const character = useMemo(() => 
    CHARACTERS.find(c => c.id === selectedCharacterId) || CHARACTERS[0], 
  [selectedCharacterId]);

  // Movement State
  const [currentLane, setCurrentLane] = useState<Lane>(Lane.CENTER);
  const [isJumping, setIsJumping] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [jumpTime, setJumpTime] = useState(0);
  const [slideTime, setSlideTime] = useState(0);
  
  // Sync state for polling
  const laneRef = useRef(currentLane);
  useEffect(() => { laneRef.current = currentLane; }, [currentLane]);

  // Gamepad/Joystick Input Debounce
  const gamepadState = useRef({
    lastLaneChangeTime: 0,
    lastJumpTime: 0,
    lastSlideTime: 0
  });
  
  const targetX = useRef(0);
  const velocityY = useRef(0);
  const positionY = useRef(0);

  useImperativeHandle(ref, () => ({
    getPosition: () => {
      if (!group.current) return new Vector3(0, 0, 0);
      return group.current.position.clone();
    },
    getLane: () => currentLane,
    isJumping: () => isJumping,
    isSliding: () => isSliding,
  }));

  // Input Handling (Keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentLane > Lane.LEFT) {
             setCurrentLane((prev) => prev - 1);
             audioManager.playSlide(); 
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentLane < Lane.RIGHT) {
             setCurrentLane((prev) => prev + 1);
             audioManager.playSlide();
          }
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          if (!isJumping && !isSliding) {
            setIsJumping(true);
            setJumpTime(0);
            velocityY.current = 14 * character.stats.jump; 
            audioManager.playJump();
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (!isSliding && !isJumping) {
            setIsSliding(true);
            setSlideTime(0);
            audioManager.playSlide();
          } else if (isJumping) {
            velocityY.current = -20; // Fast fall
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLane, isJumping, isSliding, status, character]);

  // Physics & Gamepad/Joystick Loop
  useFrame((state, delta) => {
    if (!group.current) return;
    if (status === 'paused') return;

    // --- Input Polling (Gamepad + Virtual Joystick) ---
    if (status === 'playing') {
       const gp = navigator.getGamepads()[0];
       const now = state.clock.elapsedTime;
       const { lastLaneChangeTime, lastJumpTime, lastSlideTime } = gamepadState.current;
       const INPUT_COOLDOWN = 0.2 / character.stats.handling; // Handling affects cooldown
       
       const gpX = gp ? gp.axes[0] : 0;
       const gpY = gp ? gp.axes[1] : 0;
       const btnA = gp?.buttons[0]?.pressed;
       const btnB = gp?.buttons[1]?.pressed;
       const dpadL = gp?.buttons[14]?.pressed;
       const dpadR = gp?.buttons[15]?.pressed;
       const dpadU = gp?.buttons[12]?.pressed;
       const dpadD = gp?.buttons[13]?.pressed;

       const vjX = virtualJoystick.x;
       const vjY = virtualJoystick.y;

       const inputLeft = gpX < -0.5 || dpadL || vjX < -0.5;
       const inputRight = gpX > 0.5 || dpadR || vjX > 0.5;
       const inputUp = gpY < -0.5 || btnA || dpadU || vjY < -0.5;
       const inputDown = gpY > 0.5 || btnB || dpadD || vjY > 0.5;

       if (now - lastLaneChangeTime > INPUT_COOLDOWN) {
         if (inputLeft && laneRef.current > Lane.LEFT) {
            setCurrentLane(l => l - 1);
            audioManager.playSlide();
            gamepadState.current.lastLaneChangeTime = now;
         }
       }
       
       if (now - lastLaneChangeTime > INPUT_COOLDOWN) {
         if (inputRight && laneRef.current < Lane.RIGHT) {
            setCurrentLane(l => l + 1);
            audioManager.playSlide();
            gamepadState.current.lastLaneChangeTime = now;
         }
       }
       
       if (now - lastJumpTime > 0.3) {
         if (inputUp && !isJumping && !isSliding) {
             setIsJumping(true);
             setJumpTime(0);
             velocityY.current = 14 * character.stats.jump; 
             audioManager.playJump();
             gamepadState.current.lastJumpTime = now;
         }
       }
       
       if (now - lastSlideTime > 0.3) {
         if (inputDown) {
             if (!isSliding && !isJumping) {
                setIsSliding(true);
                setSlideTime(0);
                audioManager.playSlide();
                gamepadState.current.lastSlideTime = now;
             } else if (isJumping) {
                velocityY.current = -20;
             }
         }
       }
    }

    // Lateral Movement (Lerp) - Handling affects Lerp Speed
    targetX.current = currentLane * LANE_WIDTH;
    const lerpSpeed = 15 * character.stats.handling;
    group.current.position.x += (targetX.current - group.current.position.x) * lerpSpeed * delta;

    // Vertical Movement (Gravity)
    if (isJumping) {
      positionY.current += velocityY.current * delta;
      velocityY.current -= 40 * delta; // Gravity

      if (positionY.current <= 0) {
        positionY.current = 0;
        setIsJumping(false);
        velocityY.current = 0;
        triggerShake(0.15); // Landing Impact
      }
    } else {
      positionY.current = 0;
    }
    
    group.current.position.y = positionY.current;

    // Slide Logic
    if (isSliding) {
      setSlideTime((prev) => prev + delta);
      if (slideTime > SLIDE_DURATION) {
        setIsSliding(false);
        setSlideTime(0);
      }
    }
    
    // Character Animation Procedural
    if (meshRef.current) {
        const tilt = (group.current.position.x - targetX.current) * -0.15;
        
        // Base Rotation
        meshRef.current.rotation.z = MathUtils.lerp(meshRef.current.rotation.z, tilt, 0.2);
        
        // Running Bob
        if (!isJumping) {
             meshRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 15 * character.stats.speed)) * 0.1;
             meshRef.current.rotation.x = 0.2 + (activePowerups.speedBoost > 0 ? 0.3 : 0); // Lean forward
        } else {
             meshRef.current.rotation.x = -0.3; // Lean back in air
        }
        
        if (isSliding) {
            meshRef.current.rotation.x = -Math.PI / 3;
            meshRef.current.position.y = -0.4;
        }
    }
  });

  return (
    <group ref={group}>
      <Trail
        width={activePowerups.speedBoost > 0 ? 2 : 1.2}
        length={activePowerups.speedBoost > 0 ? 12 : 5}
        color={activePowerups.speedBoost > 0 ? '#ff00ff' : character.colors.emissive}
        attenuation={(t) => t * t}
      >
        <group ref={meshRef}>
           <CharacterModel 
             type={character.modelType} 
             colors={character.colors} 
             isBoosted={activePowerups.speedBoost > 0} 
           />
        </group>
      </Trail>
      
      {/* SHIELD BUBBLE */}
      {activePowerups.shield && (
          <mesh position={[0, 1, 0]}>
              <sphereGeometry args={[1.5, 32, 32]} />
              <meshPhysicalMaterial 
                color="#00ffff" 
                transparent 
                opacity={0.2} 
                transmission={0.5}
                thickness={0.5}
                roughness={0}
                clearcoat={1}
              />
          </mesh>
      )}
      
      {/* Shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="black" opacity={0.6} transparent />
      </mesh>
    </group>
  );
});

// --- CHARACTER MODELS ---

const CharacterModel = ({ type, colors, isBoosted }: { type: string, colors: any, isBoosted: boolean }) => {
  const primaryMaterial = (
    <meshPhysicalMaterial 
       color={colors.primary} 
       roughness={0.2} 
       metalness={0.8} 
       clearcoat={1} 
       clearcoatRoughness={0.1}
    />
  );
  
  const secondaryMaterial = (
    <meshPhysicalMaterial 
       color={colors.secondary} 
       roughness={0.5} 
       metalness={0.5} 
    />
  );

  const emissiveMaterial = (
     <meshStandardMaterial 
        color={colors.emissive} 
        emissive={colors.emissive} 
        emissiveIntensity={isBoosted ? 4 : 2} 
        toneMapped={false}
     />
  );

  if (type === 'stealth') {
      return (
          <group position={[0, 0.8, 0]}>
             {/* Torso */}
             <RoundedBox args={[0.35, 0.6, 0.2]} radius={0.05} position={[0, 0.2, 0]}>
                {primaryMaterial}
             </RoundedBox>
             {/* Head - Sleek Visor */}
             <RoundedBox args={[0.25, 0.3, 0.3]} radius={0.05} position={[0, 0.7, 0.05]}>
                {secondaryMaterial}
             </RoundedBox>
             <RoundedBox args={[0.26, 0.1, 0.2]} radius={0.02} position={[0, 0.7, 0.12]}>
                {emissiveMaterial}
             </RoundedBox>
             {/* Limbs */}
             <RoundedBox args={[0.12, 0.6, 0.12]} radius={0.02} position={[-0.25, -0.2, 0]}>{secondaryMaterial}</RoundedBox>
             <RoundedBox args={[0.12, 0.6, 0.12]} radius={0.02} position={[0.25, -0.2, 0]}>{secondaryMaterial}</RoundedBox>
             {/* Jetpack */}
             <RoundedBox args={[0.2, 0.4, 0.1]} radius={0.02} position={[0, 0.3, -0.15]}>{secondaryMaterial}</RoundedBox>
             <mesh position={[0, 0.2, -0.2]}>
                 <boxGeometry args={[0.05, 0.4, 0.05]} />
                 {emissiveMaterial}
             </mesh>
          </group>
      )
  }

  if (type === 'tank') {
      return (
          <group position={[0, 0.8, 0]}>
             {/* Bulky Torso */}
             <RoundedBox args={[0.6, 0.7, 0.4]} radius={0.1} position={[0, 0.2, 0]}>
                {primaryMaterial}
             </RoundedBox>
             {/* Head - Helmet */}
             <RoundedBox args={[0.3, 0.3, 0.3]} radius={0.1} position={[0, 0.8, 0]}>
                {primaryMaterial}
             </RoundedBox>
             {/* Eye Slit */}
             <mesh position={[0, 0.8, 0.16]}>
                 <boxGeometry args={[0.25, 0.05, 0.01]} />
                 {emissiveMaterial}
             </mesh>
             {/* Heavy Shoulders */}
             <RoundedBox args={[0.25, 0.25, 0.3]} radius={0.05} position={[-0.4, 0.4, 0]}>{secondaryMaterial}</RoundedBox>
             <RoundedBox args={[0.25, 0.25, 0.3]} radius={0.05} position={[0.4, 0.4, 0]}>{secondaryMaterial}</RoundedBox>
             {/* Legs */}
             <RoundedBox args={[0.2, 0.6, 0.2]} radius={0.05} position={[-0.2, -0.4, 0]}>{secondaryMaterial}</RoundedBox>
             <RoundedBox args={[0.2, 0.6, 0.2]} radius={0.05} position={[0.2, -0.4, 0]}>{secondaryMaterial}</RoundedBox>
          </group>
      )
  }

  // Racer (Valkyrie)
  return (
      <group position={[0, 0.8, 0]}>
             {/* Streamlined Torso */}
             <RoundedBox args={[0.4, 0.6, 0.25]} radius={0.1} position={[0, 0.2, 0]}>
                {primaryMaterial}
             </RoundedBox>
             {/* Head */}
             <RoundedBox args={[0.3, 0.35, 0.35]} radius={0.15} position={[0, 0.75, 0]}>
                {primaryMaterial}
             </RoundedBox>
             {/* Holographic Wings */}
             <mesh position={[0, 0.4, -0.2]} rotation={[0, 0, 0]}>
                 <boxGeometry args={[0.1, 0.4, 0.1]} />
                 {secondaryMaterial}
             </mesh>
             <group position={[0, 0.4, -0.25]}>
                 <mesh rotation={[0, 0, 0.5]} position={[-0.4, 0, 0]}>
                     <boxGeometry args={[0.6, 0.05, 0.2]} />
                     {emissiveMaterial}
                 </mesh>
                 <mesh rotation={[0, 0, -0.5]} position={[0.4, 0, 0]}>
                     <boxGeometry args={[0.6, 0.05, 0.2]} />
                     {emissiveMaterial}
                 </mesh>
             </group>
             {/* Legs */}
             <RoundedBox args={[0.15, 0.7, 0.15]} radius={0.05} position={[-0.15, -0.4, 0]}>{secondaryMaterial}</RoundedBox>
             <RoundedBox args={[0.15, 0.7, 0.15]} radius={0.05} position={[0.15, -0.4, 0]}>{secondaryMaterial}</RoundedBox>
      </group>
  )
}


import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { ObstacleType, Lane, LANE_WIDTH } from '../types';
import * as THREE from 'three';
import { Environment, Text } from '@react-three/drei';
import { audioManager } from '../audio';
import { triggerShake } from '../effects';

interface ObstacleData {
  id: string;
  type: ObstacleType;
  lane: Lane;
  z: number;
  active: boolean;
}

const SPAWN_DISTANCE = -120;
const REMOVE_DISTANCE = 15;

export const Track: React.FC<{ playerRef: any }> = ({ playerRef }) => {
  const { 
    speed, 
    status, 
    endGame, 
    addCoin,
    activePowerups,
    activateShield,
    activateMultiplier,
    activateSpeedBoost,
    breakShield
  } = useGameStore();
  
  const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
  
  // Floor Logic
  const floorOffset = useRef(0);
  
  // Helper to create random obstacles
  const spawnObstacle = (zPosition: number) => {
    const lane = [Lane.LEFT, Lane.CENTER, Lane.RIGHT][Math.floor(Math.random() * 3)];
    const rand = Math.random();
    let type = ObstacleType.WALL;

    // 10% Chance for PowerUp
    if (rand < 0.03) type = ObstacleType.POWERUP_SHIELD;
    else if (rand < 0.06) type = ObstacleType.POWERUP_MULTIPLIER;
    else if (rand < 0.08) type = ObstacleType.POWERUP_SPEED;
    // Standard Objects
    else if (rand < 0.30) type = ObstacleType.COIN;
    else if (rand < 0.45) type = ObstacleType.TALL_WALL;
    else if (rand < 0.55) type = ObstacleType.ARCH;
    else if (rand < 0.70) type = ObstacleType.TRAIN;
    // New Obstacles
    else if (rand < 0.85) type = ObstacleType.LASER_GRID;
    else type = ObstacleType.FALLING_OBSTACLE;
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      lane,
      z: zPosition,
      active: true
    };
  };

  useFrame((state, delta) => {
    if (status !== 'playing') return;
    
    const time = state.clock.elapsedTime;
    
    // Effective speed boosts if speed powerup active
    const currentSpeed = activePowerups.speedBoost > 0 ? speed + 30 : speed;
    const moveDistance = currentSpeed * delta;
    
    // Move Floor Texture
    floorOffset.current += moveDistance * 0.1;

    setObstacles(prev => {
      const next = prev.map(obs => {
        let newZ = obs.z + moveDistance;
        
        // Trains move towards the player
        if (obs.type === ObstacleType.TRAIN) {
          if (obs.z > -60) {
             newZ += moveDistance * 0.8;
          }
        }

        return { ...obs, z: newZ };
      }).filter(obs => obs.z < REMOVE_DISTANCE);

      // Collision Detection
      const playerPos = playerRef.current?.getPosition();
      const playerLane = playerRef.current?.getLane();
      const isJumping = playerRef.current?.isJumping();
      const isSliding = playerRef.current?.isSliding();

      if (playerPos) {
        for (const obs of next) {
          if (!obs.active) continue;

          // Simple Box Collision Logic
          // Lane overlap
          if (obs.lane === playerLane) {
            // Z overlap
            const zDist = Math.abs(obs.z - playerPos.z);
            
            // Handle Powerups collision distance (generous)
            const isPowerup = obs.type.startsWith('POWERUP');
            const collisionThreshold = isPowerup ? 1.5 : 1.0;

            if (zDist < collisionThreshold) {
              if (isPowerup) {
                 obs.active = false;
                 audioManager.playPowerup();
                 if (obs.type === ObstacleType.POWERUP_SHIELD) activateShield();
                 if (obs.type === ObstacleType.POWERUP_MULTIPLIER) activateMultiplier();
                 if (obs.type === ObstacleType.POWERUP_SPEED) activateSpeedBoost();
              } else if (obs.type === ObstacleType.COIN) {
                 obs.active = false;
                 audioManager.playCoin();
                 addCoin();
              } else {
                // OBSTACLES
                let hit = false;
                
                // Special TRAIN collision box
                if (obs.type === ObstacleType.TRAIN) {
                   if (zDist < 3.5 && playerPos.y < 2.5) hit = true;
                } else if (obs.type === ObstacleType.LASER_GRID) {
                   // Laser grid is on/off
                   // 3s cycle: 1.5s ON, 1.5s OFF
                   const isLaserActive = Math.sin(time * 4) > 0;
                   if (isLaserActive) {
                       hit = true; // Cannot pass when active
                   }
                } else if (obs.type === ObstacleType.FALLING_OBSTACLE) {
                   hit = true;
                } else {
                   // STANDARD OBSTACLES
                   if (obs.type === ObstacleType.WALL) {
                      if (!isJumping && playerPos.y < 0.5) hit = true;
                   } else if (obs.type === ObstacleType.ARCH) {
                      if (!isSliding && playerPos.y > 0.5) hit = true;
                   } else {
                      // TALL_WALL
                      hit = true;
                   }
                }

                if (hit) {
                    if (activePowerups.speedBoost > 0) {
                        // Invincible Smash
                        obs.active = false;
                        audioManager.playCrash(); // Or smash sound
                        triggerShake(0.3);
                    } else if (activePowerups.shield) {
                        // Shield Break
                        obs.active = false;
                        breakShield();
                        audioManager.playShieldBreak();
                        triggerShake(0.4);
                    } else {
                        audioManager.playCrash();
                        triggerShake(0.5);
                        endGame();
                    }
                }
              }
            }
          }
        }
      }
      return next;
    });

    // Spawning Logic
    const furthestZ = obstacles.reduce((min, obs) => Math.min(min, obs.z), -20);
    
    if (furthestZ > SPAWN_DISTANCE + 30) { 
       const zPos = furthestZ - (20 + Math.random() * 15);
       
       const patternType = Math.random();
       const newObs: ObstacleData[] = [];
       
       if (patternType > 0.7) {
         for(let i=0; i<3; i++) {
           newObs.push({ ...spawnObstacle(zPos - i*2), type: ObstacleType.COIN });
         }
       } else {
          const obs1 = spawnObstacle(zPos);
          newObs.push(obs1);
          if (Math.random() > 0.4) {
             let lane2 = (obs1.lane + 1) > 1 ? -1 : obs1.lane + 1;
             newObs.push({ ...spawnObstacle(zPos), lane: lane2 as Lane, id: Math.random().toString() });
          }
       }
       
       setObstacles(prev => [...prev, ...newObs]);
    }
  });

  // Initial Population
  useMemo(() => {
    const initialObs: ObstacleData[] = [];
    for (let i = 1; i < 6; i++) {
      initialObs.push(spawnObstacle(-i * 40));
    }
    setObstacles(initialObs);
  }, []);

  return (
    <group>
      {/* Infinite Floor */}
      <Runway offset={floorOffset.current} />
      
      {/* Side Walls (Temple Run style) */}
      <SideWalls speed={activePowerups.speedBoost > 0 ? speed + 30 : speed} />

      {/* Obstacles */}
      {obstacles.map(obs => (
        obs.active && <Obstacle key={obs.id} data={obs} />
      ))}
      <Environment preset="city" />
    </group>
  );
};

const Runway: React.FC<{ offset: number }> = ({ offset }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -50]} receiveShadow>
      <planeGeometry args={[20, 200, 20, 200]} />
      <meshStandardMaterial 
        color="#1a1a2e"
        roughness={0.8}
        metalness={0.2}
        wireframe={false}
      />
      <gridHelper args={[20, 10, 0xff00ff, 0x112244]} position={[0, 0.1, 0]} rotation={[Math.PI/2, 0, 0]} />
    </mesh>
  );
};

// Moving walls to give sense of speed
const SideWalls: React.FC<{ speed: number }> = ({ speed }) => {
   const wallGroup = useRef<THREE.Group>(null);
   useFrame((state, delta) => {
      if (wallGroup.current) {
         wallGroup.current.position.z += speed * delta;
         if (wallGroup.current.position.z > 20) {
            wallGroup.current.position.z -= 40;
         }
      }
   });

   return (
     <group ref={wallGroup}>
        {[-1, 0, 1].map(i => (
           <group key={i} position={[0, 0, -i * 40]}>
              <mesh position={[-6, 2, -20]}>
                 <boxGeometry args={[1, 4, 40]} />
                 <meshStandardMaterial color="#050505" emissive="#001133" />
              </mesh>
              <mesh position={[6, 2, -20]}>
                 <boxGeometry args={[1, 4, 40]} />
                 <meshStandardMaterial color="#050505" emissive="#001133" />
              </mesh>
              {/* Neon strips */}
              <mesh position={[-5.4, 0.5, -20]}>
                 <boxGeometry args={[0.2, 0.2, 40]} />
                 <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
              </mesh>
              <mesh position={[5.4, 0.5, -20]}>
                 <boxGeometry args={[0.2, 0.2, 40]} />
                 <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={2} />
              </mesh>
           </group>
        ))}
     </group>
   )
}

const Obstacle: React.FC<{ data: ObstacleData }> = ({ data }) => {
  const { type, lane, z } = data;
  const x = lane * LANE_WIDTH;
  
  // Powerups
  if (type === ObstacleType.POWERUP_SHIELD) {
    return (
        <group position={[x, 1, z]}>
            <mesh>
                <icosahedronGeometry args={[0.4, 0]} />
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} wireframe />
            </mesh>
            <mesh>
                <icosahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
            </mesh>
            <pointLight color="#00ffff" distance={3} intensity={2} />
        </group>
    )
  }
  if (type === ObstacleType.POWERUP_MULTIPLIER) {
    return (
        <group position={[x, 1, z]}>
             <mesh rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.4, 0.1, 8, 20]} />
                <meshStandardMaterial color="#FFD700" emissive="#FFAA00" emissiveIntensity={1} />
             </mesh>
             <pointLight color="#FFD700" distance={3} intensity={2} />
        </group>
    )
  }
  if (type === ObstacleType.POWERUP_SPEED) {
    return (
        <group position={[x, 1, z]}>
             <mesh rotation={[0, 0, Math.PI/4]}>
                <coneGeometry args={[0.3, 1, 4]} />
                <meshStandardMaterial color="#FF00FF" emissive="#FF00FF" emissiveIntensity={1} />
             </mesh>
             <pointLight color="#FF00FF" distance={3} intensity={2} />
        </group>
    )
  }

  // Original Items
  if (type === ObstacleType.COIN) {
    return (
      <group position={[x, 1, z]}>
        <mesh rotation={[0, Date.now() * 0.005, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} rotation={[Math.PI/2, 0, 0]} />
          <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.1} emissive="#FFAA00" emissiveIntensity={0.6} />
        </mesh>
        <pointLight distance={3} intensity={0.5} color="#FFD700" />
      </group>
    );
  }

  if (type === ObstacleType.WALL) {
    return (
      <group position={[x, 0.6, z]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.5, 1.2, 0.5]} />
          <meshStandardMaterial color="#ff3333" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
           <boxGeometry args={[2.5, 0.1, 0.5]} />
           <meshStandardMaterial color="#ffaaaa" emissive="#ff0000" />
        </mesh>
      </group>
    );
  }

  if (type === ObstacleType.TALL_WALL) {
     return (
      <group position={[x, 2, z]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.5, 4, 1]} />
          <meshStandardMaterial color="#222" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.51]}>
          <planeGeometry args={[1.5, 3]} />
          <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1} />
        </mesh>
      </group>
    );
  }

  if (type === ObstacleType.ARCH) {
     return (
       <group position={[x, 0, z]}>
         <mesh position={[-1, 2, 0]} castShadow>
           <boxGeometry args={[0.5, 4, 0.5]} />
           <meshStandardMaterial color="#444" />
         </mesh>
         <mesh position={[1, 2, 0]} castShadow>
           <boxGeometry args={[0.5, 4, 0.5]} />
           <meshStandardMaterial color="#444" />
         </mesh>
         <mesh position={[0, 3.5, 0]} castShadow>
           <boxGeometry args={[3, 1, 0.5]} />
           <meshStandardMaterial color="#444" />
         </mesh>
         <mesh position={[0, 3.2, 0]}>
            <boxGeometry args={[2, 0.2, 0.6]} />
            <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
         </mesh>
       </group>
     );
  }

  if (type === ObstacleType.TRAIN) {
    return (
       <group position={[x, 1.8, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.8, 3.5, 12]} />
            <meshStandardMaterial color="#334455" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 6.1]}>
             <circleGeometry args={[0.8, 32]} />
             <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
          </mesh>
          <pointLight position={[0, 0, 7]} color="white" distance={15} intensity={2} />
          <mesh position={[1.41, 0.5, 0]}>
             <boxGeometry args={[0.1, 1.5, 10]} />
             <meshStandardMaterial color="black" />
          </mesh>
          <mesh position={[-1.41, 0.5, 0]}>
             <boxGeometry args={[0.1, 1.5, 10]} />
             <meshStandardMaterial color="black" />
          </mesh>
          <mesh position={[0, 1.8, 0]} rotation={[-Math.PI/2,0,0]}>
             <planeGeometry args={[2, 11]} />
             <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={0.5} />
          </mesh>
       </group>
    )
  }

  if (type === ObstacleType.LASER_GRID) {
      return <LaserGrid x={x} z={z} />
  }

  if (type === ObstacleType.FALLING_OBSTACLE) {
      return <FallingObstacle x={x} z={z} />
  }

  return null;
};

// --- NEW OBSTACLE COMPONENTS ---

const LaserGrid: React.FC<{ x: number, z: number }> = ({ x, z }) => {
    const beamsRef = useRef<THREE.Group>(null);
    const [isActive, setIsActive] = useState(false);

    useFrame((state) => {
        const active = Math.sin(state.clock.elapsedTime * 4) > 0;
        setIsActive(active);
        if (beamsRef.current) {
             beamsRef.current.visible = active;
        }
    });

    return (
        <group position={[x, 0, z]}>
            {/* Posts */}
            <mesh position={[-1.4, 2, 0]}>
                <boxGeometry args={[0.2, 4, 0.2]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[1.4, 2, 0]}>
                <boxGeometry args={[0.2, 4, 0.2]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            
            {/* Emitters */}
            <mesh position={[-1.3, 2, 0]}>
                <boxGeometry args={[0.1, 3.5, 0.1]} />
                <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
            </mesh>
            <mesh position={[1.3, 2, 0]}>
                <boxGeometry args={[0.1, 3.5, 0.1]} />
                <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
            </mesh>

            {/* Beams */}
            <group ref={beamsRef}>
                {[0.5, 1.2, 1.9, 2.6, 3.3].map((y, i) => (
                    <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI/2]}>
                        <cylinderGeometry args={[0.05, 0.05, 2.6, 8]} />
                        <meshStandardMaterial 
                            color="#ff0000" 
                            emissive="#ff0000" 
                            emissiveIntensity={4} 
                            transparent 
                            opacity={0.8}
                        />
                    </mesh>
                ))}
                <pointLight position={[0, 2, 0]} color="red" distance={5} intensity={3} />
            </group>

            {/* Warning Text */}
            {!isActive && (
                <Text 
                    position={[0, 4, 0]} 
                    fontSize={0.5} 
                    color="yellow" 
                    anchorX="center" 
                    anchorY="middle"
                >
                    !
                </Text>
            )}
        </group>
    )
}

const FallingObstacle: React.FC<{ x: number, z: number }> = ({ x, z }) => {
    const boxRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (!boxRef.current) return;
        
        const triggerZ = -40;
        const currentZ = z; // Simplified physics based on current z
        
        if (currentZ > triggerZ) {
             // Drop logic
             const progress = (currentZ - triggerZ) / 20; // 0 to 1
             const yPos = Math.max(0, 15 - (progress * 15 * 1.5)); // Drop fast
             boxRef.current.position.y = yPos;
        } else {
             boxRef.current.position.y = 15; // Hover high
        }
    });

    return (
        <group position={[x, 0, z]}>
            {/* The Drop Box */}
            <group ref={boxRef} position={[0, 15, 0]}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[2.5, 2.5, 2.5]} />
                    <meshStandardMaterial color="#444" roughness={0.5} metalness={0.8} />
                </mesh>
                {/* Hazard Stripes */}
                <mesh position={[0, 0, 1.26]}>
                    <planeGeometry args={[2.3, 2.3]} />
                    <meshStandardMaterial color="yellow" emissive="orange" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[0, 0, 1.27]} rotation={[0, 0, Math.PI/4]}>
                     <planeGeometry args={[3, 0.4]} />
                     <meshBasicMaterial color="black" />
                </mesh>
                <mesh position={[0, 0, 1.27]} rotation={[0, 0, -Math.PI/4]}>
                     <planeGeometry args={[3, 0.4]} />
                     <meshBasicMaterial color="black" />
                </mesh>
            </group>

            {/* Landing Warning */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.5, 1.5, 32]} />
                <meshBasicMaterial color="red" transparent opacity={0.5} />
            </mesh>
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
                <circleGeometry args={[0.5, 32]} />
                <meshBasicMaterial color="red" transparent opacity={0.8} />
            </mesh>
        </group>
    )
}

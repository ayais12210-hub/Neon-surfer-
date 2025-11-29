
import React, { useState, useRef, useCallback } from 'react';
import { virtualJoystick } from '../controls';

export const Joystick: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  
  // Configuration
  const MAX_RADIUS = 50; // Max drag distance in pixels

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    virtualJoystick.active = true;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!active || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate delta from center
    // e.nativeEvent.offsetX gives coordinates relative to the target, which might jitter if target moves.
    // Using client coordinates is safer relative to the fixed container.
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    // Clamp magnitude
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > MAX_RADIUS) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * MAX_RADIUS;
      dy = Math.sin(angle) * MAX_RADIUS;
    }

    setPosition({ x: dx, y: dy });

    // Update global state (normalize to -1 to 1)
    virtualJoystick.x = dx / MAX_RADIUS;
    virtualJoystick.y = dy / MAX_RADIUS;
  }, [active]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setActive(false);
    setPosition({ x: 0, y: 0 });
    
    virtualJoystick.active = false;
    virtualJoystick.x = 0;
    virtualJoystick.y = 0;
  }, []);

  return (
    <div 
      className="relative w-32 h-32 touch-none select-none pointer-events-auto"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      ref={containerRef}
    >
      {/* Base */}
      <div className={`absolute inset-0 rounded-full border-2 transition-colors duration-200 bg-black/40 backdrop-blur-sm ${active ? 'border-cyan-400 bg-black/60' : 'border-white/20'}`} />
      
      {/* Stick */}
      <div 
        className="absolute w-12 h-12 rounded-full shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-transform duration-75 ease-linear"
        style={{
          backgroundColor: active ? '#22d3ee' : 'rgba(255, 255, 255, 0.5)',
          left: '50%',
          top: '50%',
          marginLeft: '-24px',
          marginTop: '-24px',
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      >
        {/* Inner detail */}
        <div className="absolute inset-2 rounded-full border border-white/50" />
      </div>
    </div>
  );
};

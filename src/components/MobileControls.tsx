import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Circle } from 'lucide-react';

export const MobileControls: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  const simulateKeyEvent = (type: 'keydown' | 'keyup', key: string) => {
    const event = new KeyboardEvent(type, {
      key,
      code: key === ' ' ? 'Space' : `Arrow${key.replace('Arrow', '')}`,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const ControlButton = ({ keyName, icon: Icon, className = '' }: { keyName: string, icon: any, className?: string }) => (
    <button
      className={`bg-white/20 active:bg-white/40 backdrop-blur-sm p-4 rounded-full touch-none select-none ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        simulateKeyEvent('keydown', keyName);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        simulateKeyEvent('keyup', keyName);
      }}
      onPointerLeave={(e) => {
        e.preventDefault();
        simulateKeyEvent('keyup', keyName);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Icon className="w-8 h-8 text-white" />
    </button>
  );

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 flex justify-between items-end z-50 pointer-events-none">
      {/* D-Pad */}
      <div className="relative w-40 h-40 pointer-events-auto">
        <ControlButton keyName="ArrowUp" icon={ArrowUp} className="absolute top-0 left-1/2 -translate-x-1/2" />
        <ControlButton keyName="ArrowDown" icon={ArrowDown} className="absolute bottom-0 left-1/2 -translate-x-1/2" />
        <ControlButton keyName="ArrowLeft" icon={ArrowLeft} className="absolute left-0 top-1/2 -translate-y-1/2" />
        <ControlButton keyName="ArrowRight" icon={ArrowRight} className="absolute right-0 top-1/2 -translate-y-1/2" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pointer-events-auto mb-4">
        <ControlButton keyName=" " icon={Circle} className="bg-red-500/50 active:bg-red-500/80" />
      </div>
    </div>
  );
};

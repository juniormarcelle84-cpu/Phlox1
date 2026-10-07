import React, { useRef, useState, useCallback, useEffect } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Max tilt rotation in degrees (e.g. 6 to 10)
  perspective?: number; // CSS perspective value in px
  scale?: number; // Slight scale up on hover
  glare?: boolean; // Subtle light reflection effect
  disabled?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 7,
  perspective = 900,
  scale = 1.02,
  glare = true,
  disabled = false,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  style,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);
      const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      motionQuery.addEventListener('change', handleMotionChange);

      const hoverQuery = window.matchMedia('(hover: hover)');
      setCanHover(hoverQuery.matches);
      const handleHoverChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
      hoverQuery.addEventListener('change', handleHoverChange);

      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
        hoverQuery.removeEventListener('change', handleHoverChange);
      };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || prefersReducedMotion || !canHover || !cardRef.current) {
        if (onMouseMove) onMouseMove(e);
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Mouse position relative to center of the card (-0.5 to 0.5)
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const xPct = (mouseX / width) - 0.5;
      const yPct = (mouseY / height) - 0.5;

      // Inverted Y for intuitive tilt (moving mouse up tilts top edge back)
      const rotateX = -yPct * maxTilt * 2;
      const rotateY = xPct * maxTilt * 2;

      setTransformStyle({
        transform: `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: 'transform 120ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease, border-color 200ms ease'
      });

      if (glare) {
        setGlarePosition({
          x: (mouseX / width) * 100,
          y: (mouseY / height) * 100,
          opacity: 0.18
        });
      }

      if (onMouseMove) onMouseMove(e);
    },
    [disabled, prefersReducedMotion, canHover, maxTilt, perspective, scale, glare, onMouseMove]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(true);
      if (onMouseEnter) onMouseEnter(e);
    },
    [onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(false);
      setTransformStyle({
        transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
        transition: 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 300ms ease, border-color 300ms ease'
      });
      if (glare) {
        setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
      }
      if (onMouseLeave) onMouseLeave(e);
    },
    [perspective, glare, onMouseLeave]
  );

  const isInteractive = !disabled && !prefersReducedMotion && canHover;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        ...(isInteractive ? transformStyle : {}),
        transformStyle: isInteractive ? 'preserve-3d' : undefined,
        willChange: isHovered ? 'transform' : 'auto'
      }}
      className={`relative select-none ${className}`}
      {...rest}
    >
      {/* Subtle dynamic glare overlay */}
      {glare && isInteractive && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-30 transition-opacity duration-300"
          style={{
            opacity: glarePosition.opacity,
            background: `radial-gradient(circle 280px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.35), transparent 75%)`
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};

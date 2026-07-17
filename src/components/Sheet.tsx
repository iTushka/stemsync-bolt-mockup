import { useEffect, useRef, useState } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

export function Sheet({ open, onClose, children, maxHeight = '92vh' }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-stone-900/40 animate-fadeIn"
        onClick={onClose}
      />
      <SwipeableSheet onClose={onClose} maxHeight={maxHeight}>
        {children}
      </SwipeableSheet>
    </div>
  );
}

function SwipeableSheet({
  onClose,
  children,
  maxHeight,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeight: string;
}) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };

  const onTouchEnd = () => {
    dragging.current = false;
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
    startY.current = null;
  };

  return (
    <div
      className="relative bg-cream-50 rounded-t-3xl shadow-sheet animate-slideUp flex flex-col"
      style={{
        maxHeight,
        transform: `translateY(${dragY}px)`,
        transition: dragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-10 h-1.5 rounded-full bg-stone-300" />
      </div>
      {children}
    </div>
  );
}

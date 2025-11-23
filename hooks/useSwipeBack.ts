import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSwipeBack = () => {
    const navigate = useNavigate();
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Only trigger if starting from the left edge (first 100px or 20% of screen)
            const isLeftEdge = e.touches[0].clientX < 100 || e.touches[0].clientX < window.innerWidth * 0.20;

            if (isLeftEdge) {
                touchStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            } else {
                touchStartRef.current = null;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartRef.current) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartRef.current.x;
            const deltaY = Math.abs(touchEndY - touchStartRef.current.y);

            // Conditions for a valid back swipe:
            // 1. Swiped right significantly (> 100px)
            // 2. Mostly horizontal movement (deltaY < 100px)
            if (deltaX > 100 && deltaY < 100) {
                // Navigate back
                navigate(-1);
            }

            touchStartRef.current = null;
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [navigate]);
};

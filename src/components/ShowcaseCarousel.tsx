import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, ChevronRight, ChevronLeft, Share2, Check } from 'lucide-react';
import { ProjectCard } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ShowcaseCarouselProps {
  projects: ProjectCard[];
}

export default function ShowcaseCarousel({ projects }: ShowcaseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const next = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  }, [projects.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  }, [projects.length]);

  const handleShare = async (e: React.MouseEvent, project: ProjectCard) => {
    e.stopPropagation();
    const shareData = {
      title: project.title_ar,
      text: project.short_description_ar,
      url: project.project_url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(project.project_url);
        setCopiedId(project.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev]);

  const getCardStyles = (index: number) => {
    const total = projects.length;
    let offset = (index - currentIndex + total) % total;
    
    // Normalize offset to be between -2 and 2 relative to center
    if (offset > total / 2) offset -= total;

    const isActive = offset === 0;
    const isVisible = Math.abs(offset) <= 2;

    const x = offset * 340; 
    const scale = isActive ? 1.1 : 0.8 - Math.abs(offset) * 0.05;
    const rotate = offset * 12; // Dynamic rotation for 'dancing' feel
    const opacity = isActive ? 1 : 0.4 - Math.abs(offset) * 0.1;
    const zIndex = 10 - Math.abs(offset);
    
    // Active card pops up, others dip down with offset
    const y = isActive ? -80 : 60 + Math.abs(offset) * 30;

    return { x, scale, rotate, opacity, zIndex, y, isVisible };
  };

  return (
    <div className="relative w-full h-[700px] flex flex-col items-center justify-center overflow-hidden py-10" dir="rtl">
      
      {/* Cards Container */}
      <div className="relative w-full max-w-7xl h-full flex items-center justify-center">
        <AnimatePresence initial={false}>
          {projects.map((project, index) => {
            const { x, scale, rotate, opacity, zIndex, y, isVisible } = getCardStyles(index);
            if (!isVisible) return null;

            const isActive = offsetToActive(index, currentIndex, projects.length) === 0;

            return (
              <motion.div
                key={project.id}
                initial={false}
                animate={{
                  x,
                  scale,
                  rotate,
                  opacity,
                  zIndex,
                  y,
                }}
                whileHover={{ 
                  y: y - 25,
                  scale: scale * 1.05,
                  rotate: rotate * 0.5,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                transition={{
                  type: 'spring',
                  stiffness: 450, // Faster and punchier
                  damping: 28,    // Less damping for a tiny bit of playful bounce
                  mass: 0.8,      // Lighter feel
                }}
                className={cn(
                  "absolute flex flex-col w-[380px] md:w-[550px] aspect-[16/9] rounded-[40px] overflow-hidden cursor-pointer bg-white transition-shadow duration-300 group/card",
                  isActive 
                    ? "shadow-[0_40px_80px_-15px_rgba(37,99,235,0.25)] ring-8 ring-white" 
                    : "shadow-xl grayscale-[40%] hover:grayscale-0"
                )}
                onClick={() => {
                   if (isActive) {
                     window.open(project.project_url, '_blank');
                   } else {
                     setCurrentIndex(index);
                   }
                }}
              >
                {/* Image Wrap */}
                <div className="relative w-full h-full overflow-hidden">
                  <motion.img 
                    src={project.cover_image_url} 
                    alt={project.title_ar}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  />
                  
                  {/* Share Button Overlay (Top Right) */}
                  <motion.button
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    onClick={(e) => handleShare(e, project)}
                    className={cn(
                      "absolute top-6 left-6 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all duration-200 hover:bg-white hover:text-black hover:scale-110 active:scale-95 z-50",
                      !isActive && "pointer-events-none"
                    )}
                  >
                    {copiedId === project.id ? <Check size={20} /> : <Share2 size={20} />}
                  </motion.button>

                  {/* Overlay for active card info */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8 transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-0"
                  )}>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                          <span className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30">
                            {project.category}
                          </span>
                          {project.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-medium text-white/70">#{tag}</span>
                          ))}
                       </div>
                       <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">
                         {project.title_ar}
                       </h3>
                       <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-sm">
                         {project.short_description_ar}
                       </p>
                       <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                             عرض المشروع <ExternalLink size={16} />
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black">
                             <ChevronRight size={24} />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pixel Arrows Navigation */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-10 pointer-events-none z-50">
        <button 
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="pointer-events-auto p-2 group"
          aria-label="Previous"
        >
          <PixelArrow direction="left" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="pointer-events-auto p-2 group"
          aria-label="Next"
        >
          <PixelArrow direction="right" />
        </button>
      </div>

      {/* Indicators */}
      <div className="mt-12 flex gap-2">
        {projects.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "h-1.5 transition-all duration-300 rounded-full",
              idx === currentIndex ? "w-8 bg-brand-blue" : "w-2 bg-slate-300 hover:bg-slate-400"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function offsetToActive(index: number, current: number, total: number) {
  let offset = (index - current + total) % total;
  if (offset > total / 2) offset -= total;
  return offset;
}

function PixelArrow({ direction }: { direction: 'left' | 'right' }) {
  // Creating a "pixelated" arrow shape using rectangles
  return (
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="currentColor" 
      className={cn(
        "text-slate-900 transition-transform duration-200 group-active:scale-95 group-hover:text-brand-blue",
        direction === 'left' ? "rotate-180" : ""
      )}
    >
      {/* 8-bit style arrow */}
      <rect x="12" y="20" width="4" height="8" />
      <rect x="16" y="16" width="4" height="16" />
      <rect x="20" y="12" width="4" height="24" />
      <rect x="24" y="8" width="4" height="32" />
      <rect x="28" y="20" width="12" height="8" />
    </svg>
  );
}

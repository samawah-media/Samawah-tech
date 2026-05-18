import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, ChevronRight, Share2, Check } from 'lucide-react';
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
    if (projects.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  }, [projects.length]);

  const prev = useCallback(() => {
    if (projects.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  }, [projects.length]);

  const handleShare = async (event: MouseEvent, project: ProjectCard) => {
    event.stopPropagation();
    const shareData = {
      title: project.title_ar,
      text: project.short_description_ar,
      url: project.project_url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(project.project_url);
      setCopiedId(project.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev]);

  useEffect(() => {
    if (currentIndex > projects.length - 1) {
      setCurrentIndex(0);
    }
  }, [currentIndex, projects.length]);

  const getCardStyles = (index: number) => {
    const total = projects.length;
    let offset = (index - currentIndex + total) % total;
    if (offset > total / 2) offset -= total;

    const isActive = offset === 0;
    const isVisible = Math.abs(offset) <= 2;
    const x = offset * 330;
    const scale = isActive ? 1.08 : 0.78 - Math.abs(offset) * 0.04;
    const rotate = offset * 10;
    const opacity = isActive ? 1 : 0.42 - Math.abs(offset) * 0.08;
    const zIndex = 10 - Math.abs(offset);
    const y = isActive ? -70 : 65 + Math.abs(offset) * 24;

    return { x, scale, rotate, opacity, zIndex, y, isVisible, isActive };
  };

  if (projects.length === 0) {
    return (
      <div className="min-h-[420px] flex items-center justify-center px-6 text-center" dir="rtl">
        <div>
          <h2 className="text-2xl font-black text-slate-900">لا توجد مشاريع متاحة الآن</h2>
          <p className="mt-3 text-slate-500">يمكن إضافة مشاريع جديدة من لوحة الإدارة.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[640px] md:h-[700px] flex flex-col items-center justify-center overflow-hidden py-8" dir="rtl">
      <div className="relative w-full max-w-7xl h-full flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          {projects.map((project, index) => {
            const { x, scale, rotate, opacity, zIndex, y, isVisible, isActive } = getCardStyles(index);
            if (!isVisible) return null;

            return (
              <motion.article
                key={project.id}
                initial={false}
                animate={{ x, scale, rotate, opacity, zIndex, y }}
                whileHover={{
                  y: y - 22,
                  scale: scale * 1.04,
                  rotate: rotate * 0.45,
                  transition: { duration: 0.2, ease: 'easeOut' },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 430,
                  damping: 30,
                  mass: 0.8,
                }}
                className={cn(
                  'absolute flex flex-col w-[84vw] max-w-[550px] aspect-[16/9] rounded-[28px] overflow-hidden cursor-pointer bg-white transition-shadow duration-300 group/card',
                  isActive
                    ? 'shadow-[0_40px_90px_-18px_rgba(15,23,42,0.45)] ring-8 ring-white'
                    : 'shadow-xl grayscale-[35%] hover:grayscale-0',
                )}
                onClick={() => {
                  if (isActive) {
                    window.open(project.project_url, '_blank');
                    return;
                  }
                  setCurrentIndex(index);
                }}
              >
                <div className="relative w-full h-full overflow-hidden bg-slate-900">
                  <motion.img
                    src={project.cover_image_url}
                    alt={project.title_ar}
                    className="w-full h-full object-cover transition-[filter,transform] duration-500 group-hover/card:scale-105 group-hover/card:brightness-[0.58]"
                    referrerPolicy="no-referrer"
                  />

                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10 transition-opacity duration-300',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                    )}
                  />

                  <button
                    onClick={(event) => handleShare(event, project)}
                    className={cn(
                      'absolute top-5 left-5 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 text-white flex items-center justify-center transition-all duration-200 hover:bg-white hover:text-slate-950 hover:scale-105 active:scale-95 z-50',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                    )}
                    aria-label="مشاركة المشروع"
                  >
                    {copiedId === project.id ? <Check size={20} /> : <Share2 size={20} />}
                  </button>

                  <div
                    className={cn(
                      'absolute inset-x-0 bottom-0 z-20 p-5 md:p-8 translate-y-5 transition-all duration-300',
                      isActive ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover/card:opacity-100 group-hover/card:translate-y-0',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 text-[11px] font-bold bg-white text-slate-950 rounded-full">
                        {project.category}
                      </span>
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[11px] font-semibold text-white/85">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                      {project.title_ar}
                    </h3>
                    <p className="mt-2 text-white/90 text-sm md:text-base leading-7 max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                      {project.short_description_ar}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2 text-white text-sm md:text-base font-bold">
                        عرض المشروع
                        <ExternalLink size={17} />
                      </span>
                      <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-slate-950 shadow-lg">
                        <ChevronRight size={24} />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 md:px-10 pointer-events-none z-50">
        <button
          onClick={(event) => {
            event.stopPropagation();
            prev();
          }}
          className="pointer-events-auto p-2 group"
          aria-label="السابق"
        >
          <PixelArrow direction="left" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          className="pointer-events-auto p-2 group"
          aria-label="التالي"
        >
          <PixelArrow direction="right" />
        </button>
      </div>

      <div className="mt-10 flex gap-2">
        {projects.map((project, index) => (
          <button
            key={project.id}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'h-1.5 transition-all duration-300 rounded-full',
              index === currentIndex ? 'w-8 bg-brand-blue' : 'w-2 bg-slate-300 hover:bg-slate-400',
            )}
            aria-label={`عرض ${project.title_ar}`}
          />
        ))}
      </div>
    </div>
  );
}

function PixelArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={cn(
        'text-slate-900 transition-transform duration-200 group-active:scale-95 group-hover:text-brand-blue',
        direction === 'left' ? 'rotate-180' : '',
      )}
      aria-hidden="true"
    >
      <rect x="12" y="20" width="4" height="8" />
      <rect x="16" y="16" width="4" height="16" />
      <rect x="20" y="12" width="4" height="24" />
      <rect x="24" y="8" width="4" height="32" />
      <rect x="28" y="20" width="12" height="8" />
    </svg>
  );
}

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpLeft, Check, ChevronRight, ExternalLink, Share2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProjectCard } from '../types';

export type ShowcaseMode = 'grid' | 'list' | 'cards';

interface ShowcaseCarouselProps {
  projects: ProjectCard[];
  mode?: ShowcaseMode;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getGridClass(projectCount: number) {
  if (projectCount <= 1) return 'grid-cols-1 grid-rows-1';
  if (projectCount === 2) return 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1';
  if (projectCount === 3) return 'grid-cols-1 grid-rows-3 sm:grid-cols-3 sm:grid-rows-1';
  if (projectCount === 4) return 'grid-cols-2 grid-rows-2';
  if (projectCount <= 6) return 'grid-cols-2 grid-rows-3 sm:grid-cols-3 sm:grid-rows-2';
  return 'grid-cols-2 grid-rows-4 sm:grid-cols-4 sm:grid-rows-2';
}

export default function ShowcaseCarousel({ projects, mode = 'grid' }: ShowcaseCarouselProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = async (event: MouseEvent, project: ProjectCard) => {
    event.preventDefault();
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
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="min-h-[420px] flex items-center justify-center px-6 text-center" dir="rtl">
        <div>
          <h2 className="text-2xl font-black text-white">لا توجد مشاريع متاحة الآن</h2>
          <p className="mt-3 text-white/50">يمكن إضافة مشاريع جديدة من لوحة الإدارة.</p>
        </div>
      </div>
    );
  }

  if (mode === 'list') {
    return <ProjectList projects={projects} onShare={handleShare} copiedId={copiedId} />;
  }

  if (mode === 'cards') {
    return <ProjectCards projects={projects} onShare={handleShare} copiedId={copiedId} />;
  }

  return <ProjectGrid projects={projects} onShare={handleShare} copiedId={copiedId} />;
}

function ProjectGrid({
  projects,
  onShare,
  copiedId,
}: {
  projects: ProjectCard[];
  onShare: (event: MouseEvent, project: ProjectCard) => void;
  copiedId: string | null;
}) {
  return (
    <div className={cn('grid h-full w-full gap-px overflow-hidden bg-white/10', getGridClass(projects.length))}>
      {projects.map((project, index) => (
        <motion.a
          key={project.id}
          href={project.project_url}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, delay: Math.min(index * 0.05, 0.35), ease: 'easeOut' }}
          className="group relative block overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <img
            src={project.cover_image_url}
            alt={project.title_ar}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:brightness-[0.45] group-focus-visible:scale-105 group-focus-visible:brightness-[0.45]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-75 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 md:p-4">
            <span className="border border-white/25 bg-black/25 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur-md md:px-3 md:text-[11px]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={(event) => onShare(event, project)}
              className="grid h-8 w-8 place-items-center border border-white/25 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black md:h-10 md:w-10"
              aria-label={`مشاركة ${project.title_ar}`}
            >
              {copiedId === project.id ? <Check size={18} /> : <Share2 size={18} />}
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3 md:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-2 opacity-90 md:mb-4">
              <span className="bg-white px-2 py-1 text-[10px] font-black text-black md:px-3 md:text-[11px]">
                {project.category}
              </span>
              {project.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="hidden text-[11px] font-bold text-white/70 md:inline">
                  #{tag}
                </span>
              ))}
            </div>
            <h3 className="text-xl font-black leading-tight text-white sm:text-2xl md:text-4xl">
              {project.title_ar}
            </h3>
            <p className="mt-2 max-h-0 overflow-hidden text-xs leading-5 text-white/0 transition-all duration-500 group-hover:max-h-32 group-hover:text-white/85 group-focus-visible:max-h-32 group-focus-visible:text-white/85 md:mt-3 md:text-sm md:leading-7">
              {project.short_description_ar}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-xs font-black text-white md:mt-5 md:text-sm">
              فتح المشروع
              <ArrowUpLeft size={18} />
            </span>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function ProjectList({
  projects,
  onShare,
  copiedId,
}: {
  projects: ProjectCard[];
  onShare: (event: MouseEvent, project: ProjectCard) => void;
  copiedId: string | null;
}) {
  return (
    <div className="h-full w-full overflow-hidden border-y border-white/10">
      {projects.map((project, index) => (
        <motion.a
          key={project.id}
          href={project.project_url}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.28) }}
          className="group grid min-h-0 gap-2 border-b border-white/10 px-2 py-2 transition-colors hover:bg-white hover:text-black sm:grid-cols-[52px_1fr_150px_44px] sm:items-center md:grid-cols-[90px_1fr_220px_56px] md:px-4"
          style={{ height: `${100 / projects.length}%` }}
        >
          <span className="text-sm font-black text-white/35 transition-colors group-hover:text-black/45">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <h3 className="text-xl font-black leading-tight sm:text-2xl md:text-4xl">{project.title_ar}</h3>
            <p className="mt-1 line-clamp-2 max-w-3xl text-xs leading-5 text-white/55 transition-colors group-hover:text-black/60 md:text-sm md:leading-6">
              {project.short_description_ar}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className="hidden border border-white/15 px-3 py-1 text-xs font-bold text-white/60 transition-colors group-hover:border-black/15 group-hover:text-black/60 sm:inline-flex">
              {project.category}
            </span>
            <button
              type="button"
              onClick={(event) => onShare(event, project)}
              className="grid h-8 w-8 place-items-center border border-white/15 text-white/70 transition-colors hover:bg-black hover:text-white group-hover:border-black/15 group-hover:text-black"
              aria-label={`مشاركة ${project.title_ar}`}
            >
              {copiedId === project.id ? <Check size={15} /> : <Share2 size={15} />}
            </button>
          </div>
          <span className="hidden h-12 w-12 place-items-center border border-white/20 transition-colors group-hover:border-black group-hover:bg-black group-hover:text-white sm:grid">
            <ArrowUpLeft size={22} />
          </span>
        </motion.a>
      ))}
    </div>
  );
}

function ProjectCards({
  projects,
  onShare,
  copiedId,
}: {
  projects: ProjectCard[];
  onShare: (event: MouseEvent, project: ProjectCard) => void;
  copiedId: string | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  }, [projects.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  }, [projects.length]);

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
    const x = offset * 310;
    const scale = isActive ? 1 : 0.78 - Math.abs(offset) * 0.04;
    const rotate = offset * 6;
    const opacity = isActive ? 1 : 0.38 - Math.abs(offset) * 0.08;
    const zIndex = 10 - Math.abs(offset);
    const y = isActive ? -18 : 42 + Math.abs(offset) * 16;

    return { x, scale, rotate, opacity, zIndex, y, isVisible, isActive };
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden" dir="rtl">
      <div className="relative flex h-full w-full items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          {projects.map((project, index) => {
            const { x, scale, rotate, opacity, zIndex, y, isVisible, isActive } = getCardStyles(index);
            if (!isVisible) return null;

            return (
              <motion.article
                key={project.id}
                initial={false}
                animate={{ x, scale, rotate, opacity, zIndex, y }}
                whileHover={{ y: y - 16, scale: scale * 1.025, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.8 }}
                className={cn(
                  'absolute w-[88vw] max-w-[600px] aspect-[16/10] overflow-hidden bg-black shadow-2xl ring-1 ring-white/15 group/card',
                  isActive ? 'cursor-pointer' : 'cursor-default grayscale-[30%]',
                )}
                onClick={() => {
                  if (isActive) {
                    window.open(project.project_url, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  setCurrentIndex(index);
                }}
              >
                <img
                  src={project.cover_image_url}
                  alt={project.title_ar}
                  className="h-full w-full object-cover transition duration-700 group-hover/card:scale-105 group-hover/card:brightness-[0.5]"
                  referrerPolicy="no-referrer"
                />
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10 transition-opacity duration-300',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                  )}
                />

                <button
                  type="button"
                  onClick={(event) => onShare(event, project)}
                  className={cn(
                    'absolute left-5 top-5 z-40 grid h-11 w-11 place-items-center border border-white/25 bg-black/30 text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                  )}
                  aria-label={`مشاركة ${project.title_ar}`}
                >
                  {copiedId === project.id ? <Check size={20} /> : <Share2 size={20} />}
                </button>

                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 z-20 p-5 transition-all duration-300 md:p-8',
                    isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100',
                  )}
                >
                  <span className="inline-flex bg-white px-3 py-1 text-[11px] font-black text-black">
                    {project.category}
                  </span>
                  <h3 className="mt-4 text-3xl font-black leading-tight text-white md:text-5xl">
                    {project.title_ar}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/82 md:text-base">
                    {project.short_description_ar}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-white">
                    عرض المشروع
                    <ExternalLink size={17} />
                  </span>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-50 hidden -translate-y-1/2 justify-between px-3 md:flex">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            prev();
          }}
          className="pointer-events-auto grid h-14 w-14 place-items-center border border-white/20 bg-black/35 text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black"
          aria-label="السابق"
        >
          <ChevronRight size={26} className="rotate-180" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          className="pointer-events-auto grid h-14 w-14 place-items-center border border-white/20 bg-black/35 text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black"
          aria-label="التالي"
        >
          <ChevronRight size={26} />
        </button>
      </div>

      <div className="absolute bottom-4 flex gap-2 md:bottom-8">
        {projects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'h-1.5 transition-all duration-300',
              index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/25 hover:bg-white/60',
            )}
            aria-label={`عرض ${project.title_ar}`}
          />
        ))}
      </div>
    </div>
  );
}

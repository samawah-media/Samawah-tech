import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShowcaseCarousel, { type ShowcaseMode } from '../components/ShowcaseCarousel';
import { getProjects, getShowcaseLinkBySlug } from '../lib/firebase';
import { ProjectCard, ShowcaseLink } from '../types';
import { motion } from 'motion/react';
import { FALLBACK_LINKS, SEED_PROJECTS } from '../constants';

const introVideoUrl = '/media/e_a_be_db_mp_.mp4';
const backgroundImageUrl = '/backgrounds/samawah-cosmic-grid.jpg';

const viewOptions: { id: ShowcaseMode; label: string }[] = [
  { id: 'grid', label: 'شبكة' },
  { id: 'list', label: 'قائمة' },
  { id: 'cards', label: 'عرض' },
];

function buildOrderedProjectsFromLink(
  publicProjects: ProjectCard[],
  projectIds: string[],
): ProjectCard[] {
  const map = new Map(publicProjects.map((project) => [project.id, project]));
  return projectIds.map((id) => map.get(id)).filter(Boolean) as ProjectCard[];
}

function shouldShowAllProjects(link: ShowcaseLink | null) {
  return !link || ['default', 'projects'].includes(link.slug);
}

function isLinkActive(link: ShowcaseLink | null) {
  if (!link || !link.is_active) return false;

  const now = new Date();
  if (link.starts_at && new Date(link.starts_at) > now) return false;
  if (link.ends_at && new Date(link.ends_at) < now) return false;
  return true;
}

function getPublicProjects(projects: ProjectCard[]) {
  return projects
    .filter((project) => project.is_visible && project.status === 'published')
    .sort((a, b) => a.sort_order - b.sort_order);
}

function buildInitialState(slug?: string) {
  const publicProjects = getPublicProjects(SEED_PROJECTS);
  if (!slug) return { link: null, projects: publicProjects, loading: false };

  const fallbackLink = FALLBACK_LINKS.find((item) => item.slug === slug) || null;
  if (!isLinkActive(fallbackLink)) return { link: null, projects: [], loading: true };

  if (shouldShowAllProjects(fallbackLink)) {
    return { link: fallbackLink, projects: publicProjects, loading: false };
  }

  const linkedProjects = buildOrderedProjectsFromLink(publicProjects, fallbackLink.project_ids);
  return {
    link: fallbackLink,
    projects: linkedProjects.length > 0 ? linkedProjects : publicProjects,
    loading: false,
  };
}

export default function Home() {
  const { slug } = useParams();
  const initialState = useMemo(() => buildInitialState(slug), [slug]);
  const [projects, setProjects] = useState<ProjectCard[]>(initialState.projects);
  const [loading, setLoading] = useState(initialState.loading);
  const [link, setLink] = useState<ShowcaseLink | null>(initialState.link);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<ShowcaseMode>('grid');
  const [titleSplit, setTitleSplit] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    let active = true;
    const nextInitialState = buildInitialState(slug);

    setProjects(nextInitialState.projects);
    setLink(nextInitialState.link);
    setLoading(nextInitialState.loading);
    setNotFound(false);

    (async () => {
      const all = await getProjects();
      if (!active) return;

      const publicProjects = getPublicProjects(all);

      if (!slug) {
        setLink(null);
        setProjects(publicProjects);
        setLoading(false);
        return;
      }

      const found = await getShowcaseLinkBySlug(slug);
      if (!active) return;

      if (!isLinkActive(found)) {
        setLink(null);
        setProjects([]);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const linkedProjects = buildOrderedProjectsFromLink(
        publicProjects,
        found?.project_ids || [],
      );

      setLink(found as ShowcaseLink);
      setProjects(
        shouldShowAllProjects(found as ShowcaseLink)
          ? publicProjects
          : linkedProjects.length > 0
            ? linkedProjects
            : publicProjects,
      );
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const title = link ? link.title_ar : 'حلول سماوة التقنية';
  const introLabel = link ? 'SAMAWAH PRIVATE VIEW' : 'SAMAWAH SOLUTIONS®';
  const titleWords = title.split(' ');
  const titleStart = titleWords.slice(0, -1).join(' ') || title;
  const titleEnd = titleWords.length > 1 ? titleWords[titleWords.length - 1] : '';

  useEffect(() => {
    setTitleSplit(false);
    setIntroDone(false);
    setIntroStarted(false);
    setVideoReady(false);

    const fallbackStartTimer = window.setTimeout(() => setIntroStarted(true), 900);

    return () => {
      window.clearTimeout(fallbackStartTimer);
    };
  }, [slug]);

  useEffect(() => {
    if (!introStarted) return undefined;

    const splitTimer = window.setTimeout(() => setTitleSplit(true), 5600);
    const doneTimer = window.setTimeout(() => setIntroDone(true), 8000);

    return () => {
      window.clearTimeout(splitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [introStarted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6 py-20 text-white" dir="rtl">
        <h1 className="text-3xl font-black mb-4">الرابط غير متاح أو انتهت صلاحيته</h1>
        <p className="text-white/60 max-w-lg leading-7">
          قد يكون الرابط موقوفا مؤقتا أو مخصصا لفترة عرض محددة.
        </p>
        <Link to="/" className="mt-8 inline-flex h-12 items-center justify-center border border-white px-6 text-sm font-bold transition-colors hover:bg-white hover:text-black">
          العودة للمعرض
        </Link>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#080713] text-white selection:bg-white selection:text-black" dir="rtl">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full scale-105 object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(80,65,190,0.16)_0%,rgba(8,7,19,0.42)_46%,rgba(3,3,8,0.88)_100%)]" />
      </div>
      <header className="fixed inset-x-0 top-0 z-50 h-20" dir="ltr">
        <div>
          <Link to="/" className="group fixed left-3 top-4 flex items-center gap-3 text-left md:left-8" aria-label="Samawah Tech">
            <span className="grid h-8 w-8 place-items-center border border-white/70 text-[10px] font-black transition-colors group-hover:bg-white group-hover:text-black">
              ST
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-white/80 sm:block">
              Samawah Tech
            </span>
          </Link>

          <nav className="fixed left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 border border-white/15 bg-black/35 p-1 backdrop-blur-xl" dir="rtl" aria-label="طرق عرض المشاريع">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={`h-9 min-w-12 px-2 text-xs font-bold transition-colors sm:min-w-16 sm:px-4 ${
                  mode === option.id
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setIntroDone(true)}
            className="fixed left-14 top-4 grid h-10 w-12 place-items-center border border-white bg-white text-[10px] font-black text-black transition-colors hover:bg-transparent hover:text-white sm:left-auto sm:right-3 sm:w-16 sm:text-xs md:right-8"
          >
            سماوة
          </button>
        </div>
      </header>

      <section className="absolute inset-0 z-10 overflow-hidden">
        <motion.div
          animate={{ opacity: introDone ? 0.18 : 1, scale: introDone ? 1.08 : 1 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <video
            className={`h-full w-full bg-transparent object-cover transition-opacity duration-500 ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
            src={introVideoUrl}
            autoPlay
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            onPlay={() => setIntroStarted(true)}
            onTimeUpdate={(event) => {
              if (event.currentTarget.currentTime >= 7.8) {
                setIntroDone(true);
              }
            }}
            onEnded={() => setIntroDone(true)}
          />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.34)_58%,rgba(3,3,8,0.88)_100%)]" />
        </motion.div>

        <motion.div
          animate={{ opacity: introDone ? 0 : 1 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="pointer-events-none relative z-10 flex h-screen flex-col items-center justify-center px-4 text-center"
        >
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="mb-5 text-xs font-bold uppercase tracking-[0.26em] text-white/70"
            dir="ltr"
          >
            {introLabel}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
            className="flex max-w-[92vw] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-balance text-4xl font-black leading-[1.18] sm:max-w-6xl sm:text-7xl sm:leading-[1.08] md:text-8xl lg:text-9xl"
          >
            <motion.span
              animate={{
                x: titleSplit ? 140 : 0,
                opacity: titleSplit ? 0 : 1,
                filter: titleSplit ? 'blur(12px)' : 'blur(0px)',
              }}
              transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
            >
              {titleStart}
            </motion.span>
            {titleEnd ? (
              <motion.span
                animate={{
                  x: titleSplit ? -140 : 0,
                  opacity: titleSplit ? 0 : 1,
                  filter: titleSplit ? 'blur(12px)' : 'blur(0px)',
                }}
                transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
              >
                {titleEnd}
              </motion.span>
            ) : null}
          </motion.h1>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => setIntroDone(true)}
          animate={{ opacity: introDone ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/55"
          dir="ltr"
        >
          <span>Enter</span>
          <span className="h-12 w-px overflow-hidden bg-white/20">
            <motion.span
              className="block h-5 w-px bg-white"
              animate={{ y: [-20, 48] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </motion.button>
      </section>

      <motion.section
        className="absolute inset-0 z-20 px-2 pb-2 pt-20 md:px-4 md:pb-4"
        initial={false}
        animate={{
          opacity: introDone ? 1 : 0,
          scale: introDone ? 1 : 1.08,
          pointerEvents: introDone ? 'auto' : 'none',
        }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <ShowcaseCarousel projects={projects} mode={mode} />
      </motion.section>
    </main>
  );
}

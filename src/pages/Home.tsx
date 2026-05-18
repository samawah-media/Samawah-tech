import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShowcaseCarousel, { type ShowcaseMode } from '../components/ShowcaseCarousel';
import { getProjects, getShowcaseLinkBySlug } from '../lib/firebase';
import { ProjectCard, ShowcaseLink } from '../types';
import { motion, useScroll, useTransform } from 'motion/react';
import { FALLBACK_LINKS, SEED_PROJECTS } from '../constants';

const introVideoUrl = '/media/e_a_be_db_mp_.mp4';

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
  const heroRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 120]);

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
      setProjects(linkedProjects.length > 0 ? linkedProjects : publicProjects);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const title = link ? link.title_ar : 'حلول سماوة التقنية';
  const introLabel = link ? 'SAMAWAH PRIVATE VIEW' : 'SAMAWAH SOLUTIONS®';

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
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-white selection:text-black" dir="rtl">
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

          <a
            href="#projects"
            className="fixed left-14 top-4 grid h-10 w-12 place-items-center border border-white bg-white text-[10px] font-black text-black transition-colors hover:bg-transparent hover:text-white sm:left-auto sm:right-3 sm:w-16 sm:text-xs md:right-8"
          >
            سماوة
          </a>
        </div>
      </header>

      <section ref={heroRef} className="relative min-h-[100svh] overflow-hidden">
        <motion.div style={{ scale: heroScale, opacity: heroOpacity }} className="absolute inset-0">
          <video
            className="h-full w-full object-cover"
            src={introVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/og-image.png"
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.45)_58%,rgba(0,0,0,0.95)_100%)]" />
        </motion.div>

        <motion.div
          style={{ y: titleY }}
          className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-4 text-center"
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
            className="max-w-[92vw] text-balance text-4xl font-black leading-[1.18] sm:max-w-6xl sm:text-7xl sm:leading-[1.08] md:text-8xl lg:text-9xl"
          >
            {title}
          </motion.h1>
        </motion.div>

        <a
          href="#projects"
          className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/55"
          dir="ltr"
        >
          <span>Scroll</span>
          <span className="h-12 w-px overflow-hidden bg-white/20">
            <motion.span
              className="block h-5 w-px bg-white"
              animate={{ y: [-20, 48] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </a>
      </section>

      <section id="projects" className="relative z-10 min-h-screen border-t border-white/10 bg-[#050505] px-3 py-16 md:px-6 md:py-24">
        <div className="mx-auto mb-8 flex max-w-[1600px] flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/45" dir="ltr">
              Selected Work
            </p>
            <h2 className="text-3xl font-black md:text-5xl">
              {link ? link.title_ar : 'المشاريع'}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/55 md:text-base">
            {link?.description_ar || 'اختر طريقة العرض المناسبة واستعرض مشاريع سماوة بروابط مباشرة وتجربة أوضح على الجوال.'}
          </p>
        </div>

        <ShowcaseCarousel projects={projects} mode={mode} />
      </section>
    </main>
  );
}

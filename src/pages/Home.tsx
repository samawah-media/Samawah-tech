import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShowcaseCarousel from '../components/ShowcaseCarousel';
import { getProjects, getShowcaseLinkBySlug } from '../lib/firebase';
import { ProjectCard, ShowcaseLink } from '../types';
import { motion } from 'motion/react';
import { FALLBACK_LINKS, SEED_PROJECTS } from '../constants';

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
  return projects.filter((project) => project.is_visible && project.status === 'published');
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
  const initialState = buildInitialState(slug);
  const [projects, setProjects] = useState<ProjectCard[]>(initialState.projects);
  const [loading, setLoading] = useState(initialState.loading);
  const [link, setLink] = useState<ShowcaseLink | null>(initialState.link);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6 py-20" dir="rtl">
        <h1 className="text-3xl font-black text-slate-900 mb-4">الرابط غير متاح أو انتهت صلاحيته</h1>
        <p className="text-slate-500 max-w-lg">
          قد يكون الرابط موقوفًا مؤقتًا أو مخصصًا لفترة عرض محددة.
        </p>
        <Link to="/" className="mt-6 inline-block bg-brand-blue text-white px-6 py-3 rounded-xl font-bold">
          العودة للمعرض
        </Link>
      </main>
    );
  }

  const title = link ? link.title_ar : 'حلول سماوة التقنية';
  const subTitle =
    link?.description_ar ||
    'منصات ومنتجات رقمية نبنيها لتسهيل العمل، تنظيم المعرفة، وأتمتة التجارب.';

  return (
    <main className="min-h-screen bg-white relative overflow-hidden" dir="rtl">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] left-[-5%] w-[30%] h-[30%] bg-brand-yellow/5 rounded-full blur-[100px] pointer-events-none" />

      <section className="pt-10 md:pt-24 pb-3 md:pb-8 px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mb-4">
            مشاريع سماوة التقنية
          </span>
          {link ? (
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 mb-3 md:mb-5">
              {title}
            </h1>
          ) : (
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 mb-4 md:mb-6 leading-tight">
              حلول سماوة <span className="text-brand-blue">التقنية</span>
            </h1>
          )}
          {subTitle && (
            <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
              {subTitle}
            </p>
          )}
        </motion.div>
      </section>

      <section className="relative z-10">
        <ShowcaseCarousel projects={projects} />
      </section>

      <footer className="py-12 px-4 text-center text-slate-400 text-sm font-medium">
        <div className="flex items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <span className="w-8 h-[2px] bg-slate-300" />
          <span className="text-xs">SAMAWAH DIGITAL SHOWCASE</span>
          <span className="w-8 h-[2px] bg-slate-300" />
        </div>
      </footer>
    </main>
  );
}

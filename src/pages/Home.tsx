import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShowcaseCarousel from '../components/ShowcaseCarousel';
import { getProjects, getShowcaseLinkBySlug } from '../lib/firebase';
import { ProjectCard, ShowcaseLink } from '../types';
import { motion } from 'motion/react';

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

export default function Home() {
  const { slug } = useParams();
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<ShowcaseLink | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    (async () => {
      const all = await getProjects();
      const publicProjects = all.filter(
        (project) => project.is_visible && project.status === 'published',
      );

      if (!slug) {
        setLink(null);
        setProjects(publicProjects);
        setLoading(false);
        return;
      }

      const found = await getShowcaseLinkBySlug(slug);
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
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6 py-20" dir="rtl">
        <h1 className="text-3xl font-black text-slate-900 mb-4">?????? ??? ????? ?? ??? ?????</h1>
        <p className="text-slate-500 max-w-lg">
          ?????? ??????? ???? ???? ?????? ????? ??? ??? ?????? ?? ????? ???????.
        </p>
        <Link to="/" className="mt-6 inline-block bg-brand-blue text-white px-6 py-3 rounded-xl font-bold">
          ?????? ????????
        </Link>
      </main>
    );
  }

  const title = link
    ? `???? ?????? ????? - ${link.title_ar}`
    : '?????? ??? ?? ???? ?????';
  const subTitle =
    link?.description_ar || '?????? ????? ?????? ???? ???????? ??????? ???????? ????????.';

  return (
    <main className="min-h-screen bg-white relative overflow-hidden" dir="rtl">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] left-[-5%] w-[30%] h-[30%] bg-brand-yellow/5 rounded-full blur-[100px] pointer-events-none" />

      <section className="pt-24 pb-10 px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mb-4 tracking-widest uppercase">
            ?????? ????? ???????
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {subTitle}
          </p>
        </motion.div>
      </section>

      <section className="relative z-10">
        <ShowcaseCarousel projects={projects} />
      </section>

      <footer className="py-12 px-4 text-center text-slate-400 text-sm font-medium">
        <div className="flex items-center justify-center gap-3 opacity-30 hover:opacity-100 transition-opacity duration-300">
          <span className="w-8 h-[2px] bg-slate-300" />
          <span className="tracking-widest uppercase text-xs">SAMAWAH DIGITAL SHOWCASE</span>
          <span className="w-8 h-[2px] bg-slate-300" />
        </div>
      </footer>
    </main>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Save,
  X,
  LogIn,
  Link as LinkIcon,
  Link2Off,
} from 'lucide-react';
import { ProjectCard, ShowcaseLink } from '../types';
import {
  getProjects,
  getShowcaseLinks,
  db,
  ensureFirebaseReady,
  signInAdmin,
  signOutAdmin,
  isAllowedAdminEmail,
  onAuthUserChanged,
} from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FALLBACK_ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

const newProjectTemplate: Partial<ProjectCard> = {
  is_visible: true,
  status: 'published',
  tags: [],
  sort_order: 1,
  accent_color: '#3b82f6',
};

const defaultLinkTemplate: Partial<ShowcaseLink> = {
  is_active: true,
  sort_order: 1,
  starts_at: null,
  ends_at: null,
  title_ar: '',
  description_ar: '',
  project_ids: [],
};

export default function Admin() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [links, setLinks] = useState<ShowcaseLink[]>([]);
  const [editingProject, setEditingProject] = useState<Partial<ProjectCard> | null>(null);
  const [editingLink, setEditingLink] = useState<Partial<ShowcaseLink> | null>(null);
  const [linkProjectIds, setLinkProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [search, setSearch] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'links'>('projects');
  const isDemoMode = !firebaseEnabled;

  useEffect(() => {
    let active = true;
    let stop = () => {};

    (async () => {
      const ready = await ensureFirebaseReady();
      if (!active) return;

      setFirebaseEnabled(ready);

      if (!ready) {
        setAuthLoading(false);
        return;
      }

      stop = onAuthUserChanged((userState) => {
        if (!active) return;
        setUser(userState);
        setAuthLoading(false);
      });
    })();

    return () => {
      active = false;
      stop();
    };
  }, []);

  const canEdit = useMemo(() => {
    if (!firebaseEnabled) return true;
    if (!user) return false;
    if (FALLBACK_ADMIN_EMAILS.length === 0) {
      return isAllowedAdminEmail(user.email);
    }
    return (
      FALLBACK_ADMIN_EMAILS.includes((user.email || '').toLowerCase()) ||
      isAllowedAdminEmail(user.email)
    );
  }, [firebaseEnabled, user]);

  const visibleProjects = useMemo(() => {
    return projects.filter(
      (project) =>
        project.title_ar.toLowerCase().includes(search.toLowerCase()) ||
        project.slug.toLowerCase().includes(search.toLowerCase()) ||
        project.category.toLowerCase().includes(search.toLowerCase()),
    );
  }, [projects, search]);

  const visibleLinks = useMemo(() => {
    return links.filter(
      (item) =>
        item.slug.toLowerCase().includes(linkSearch.toLowerCase()) ||
        item.title_ar.toLowerCase().includes(linkSearch.toLowerCase()),
    );
  }, [links, linkSearch]);

  useEffect(() => {
    const hydrate = async () => {
      const [projectsData, linksData] = await Promise.all([getProjects(), getShowcaseLinks()]);
      setProjects(projectsData);
      setLinks(linksData);
      setLoading(false);
    };

    hydrate();
  }, []);

  const handleSignIn = async () => {
    await signInAdmin();
  };

  const handleSignOut = async () => {
    await signOutAdmin();
  };

  const handleSaveProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProject) return;

    const now = new Date().toISOString();
    const projectData = {
      ...newProjectTemplate,
      ...editingProject,
      updated_at: now,
      created_at: editingProject.created_at || now,
      id: editingProject.id || Math.random().toString(36).substr(2, 9),
    } as ProjectCard;

    if (db) {
      await setDoc(doc(db, 'projects', projectData.id), projectData);
    }

    setProjects((prev) => {
      const exists = prev.find((project) => project.id === projectData.id);
      if (exists) return prev.map((project) => (project.id === projectData.id ? projectData : project));
      return [...prev, projectData];
    });

    setEditingProject(null);
  };
  const toggleVisibility = async (id: string, current: boolean) => {
    if (db) {
      await updateDoc(doc(db, 'projects', id), { is_visible: !current, updated_at: new Date().toISOString() });
    }
    setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, is_visible: !current } : project)));
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm('?? ??? ????? ??? ???? ??? ??? ??????? ????????')) return;

    if (db) {
      await deleteDoc(doc(db, 'projects', id));
    }
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const handleSaveLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingLink) return;

    const now = new Date().toISOString();
    const linkData = {
      ...defaultLinkTemplate,
      ...editingLink,
      id: editingLink.id || Math.random().toString(36).substr(2, 9),
      updated_at: now,
      created_at: editingLink.created_at || now,
      project_ids: linkProjectIds,
    } as ShowcaseLink;

    if (db) {
      await setDoc(doc(db, 'showcase_links', linkData.id), linkData);
    }

    setLinks((prev) => {
      const exists = prev.find((item) => item.id === linkData.id);
      if (exists) return prev.map((item) => (item.id === linkData.id ? linkData : item));
      return [...prev, linkData];
    });

    setEditingLink(null);
    setLinkProjectIds([]);
  };

  const deleteLink = async (id: string) => {
    if (!window.confirm('?? ??? ????? ??? ???? ??? ???? ????? ????')) return;

    if (db) {
      await deleteDoc(doc(db, 'showcase_links', id));
    }
    setLinks((prev) => prev.filter((link) => link.id !== id));
  };

  const toggleLink = async (id: string, current: boolean) => {
    if (db) {
      await updateDoc(doc(db, 'showcase_links', id), {
        is_active: !current,
        updated_at: new Date().toISOString(),
      });
    }

    setLinks((prev) => prev.map((item) => (item.id === id ? { ...item, is_active: !current } : item)));
  };

  const copyLink = async (slug: string) => {
    const link = `${window.location.origin}/v/${slug}`;
    await navigator.clipboard.writeText(link);
  };

  const openLinkPreview = (slug: string) => {
    window.open(`${window.location.origin}/v/${slug}`, '_blank');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900">????? ???? ??????</h1>
          <p className="mt-3 text-slate-500">??? ?????? ???? ????????. ??? ?????? ????? ??????.</p>
          <button
            onClick={handleSignIn}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-bold"
          >
            <LogIn size={18} />
            ????? ?????? ???????? Google
          </button>
          <p className="text-xs text-slate-400 mt-4">???? Firebase ???? ?????? ?????? ???? ??????.</p>
          <Link to="/" className="mt-6 inline-block text-slate-500 text-sm underline">
            ?????? ??????
          </Link>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">???? ??????</h1>
            <p className="text-slate-500">???? ???? ????????? ?????? ????? ???????</p>
            {user ? <p className="text-xs text-slate-400 mt-1">?????? {user.email}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-bold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              ??? ??????
            </Link>
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-bold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                ???? ??????
              </button>
            ) : null}
            {activeTab === 'projects' ? (
              <button
                onClick={() => setEditingProject(newProjectTemplate)}
                className="px-6 py-2 bg-brand-blue text-white rounded-xl font-bold pixel-shadow-hover transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                ????? ?????
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingLink({
                    ...defaultLinkTemplate,
                    sort_order: links.length + 1,
                  });
                  setLinkProjectIds([]);
                }}
                className="px-6 py-2 bg-brand-blue text-white rounded-xl font-bold pixel-shadow-hover transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                ????? ???? ???
              </button>
            )}
          </div>
        </header>

        {isDemoMode ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <div className="font-bold">????? ???????</div>
            <p className="mt-1 leading-7">
              ????? ?????? ???? ??????? ???????. ????? ??????? ??????? ????? ?????? ?????? ??? ?? ??????? ??????? ????? ???? Firebase ??????.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'px-4 py-2 rounded-xl border text-sm font-bold',
              activeTab === 'projects' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200',
            )}
          >
            ????????
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={cn(
              'px-4 py-2 rounded-xl border text-sm font-bold',
              activeTab === 'links' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200',
            )}
          >
            ????? ????? ???????
          </button>
        </div>

        {activeTab === 'projects' ? (
          <>
            <div className="relative mb-6">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="???? ?? ????????..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-12 pl-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all shadow-sm"
              />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">???????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">???????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">??????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">??????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left">?????????</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img src={project.cover_image_url} className="w-16 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200" alt={project.title_ar} />
                            <div>
                              <div className="font-bold text-slate-900">{project.title_ar}</div>
                              <div className="text-xs text-slate-400">{project.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 rounded-full text-slate-600">{project.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                              project.status === 'published'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-slate-50 text-slate-500 border-slate-100',
                            )}
                          >
                            {project.status === 'published' ? '?????' : '??? ?????'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleVisibility(project.id, project.is_visible)}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              project.is_visible ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50',
                            )}
                          >
                            {project.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <a href={project.project_url} target="_blank" className="p-2 hover:bg-slate-100 rounded-lg" rel="noreferrer">
                              <ExternalLink size={18} />
                            </a>
                            <button onClick={() => setEditingProject(project)} className="p-2 hover:bg-brand-blue/10 hover:text-brand-blue rounded-lg">
                              <Edit3 size={18} />
                            </button>
                            <button onClick={() => deleteProject(project.id)} className="p-2 hover:bg-rose-100 hover:text-rose-600 rounded-lg">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="???? ?? ????? ?????"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="w-full pr-12 pl-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all shadow-sm"
              />
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">??????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">?????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">???????? ????????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">??????</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left">?????????</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLinks.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">/{item.slug}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.description_ar}</td>
                        <td className="px-6 py-4 text-slate-500">{item.project_ids.length} ?????</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleLink(item.id, item.is_active)}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              item.is_active ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50',
                            )}
                          >
                            {item.is_active ? <LinkIcon size={18} /> : <Link2Off size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button
                              onClick={() => copyLink(item.slug)}
                              className="p-2 hover:bg-slate-100 rounded-lg"
                              title="??? ??????"
                            >
                              <Link2 size={18} />
                            </button>
                            <button
                              onClick={() => openLinkPreview(item.slug)}
                              className="p-2 hover:bg-brand-blue/10 hover:text-brand-blue rounded-lg"
                              title="?????? ??????"
                            >
                              <ExternalLink size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingLink(item);
                                setLinkProjectIds(item.project_ids);
                              }}
                              className="p-2 hover:bg-brand-blue/10 hover:text-brand-blue rounded-lg"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button onClick={() => deleteLink(item.id)} className="p-2 hover:bg-rose-100 hover:text-rose-600 rounded-lg">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingProject(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900">{editingProject.id ? '????? ?????' : '????? ????? ????'}</h2>
                <button onClick={() => setEditingProject(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">??? ???????</label>
                    <input
                      required
                      value={editingProject.title_ar || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, title_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">?????? (Slug)</label>
                    <input
                      required
                      value={editingProject.slug || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">????? ??????</label>
                    <input
                      value={editingProject.subtitle_ar || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, subtitle_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">???? ???????</label>
                    <input
                      required
                      type="url"
                      value={editingProject.project_url || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, project_url: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">?????? ???????</label>
                    <input
                      required
                      type="url"
                      value={editingProject.cover_image_url || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, cover_image_url: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">???????</label>
                    <input
                      value={editingProject.category || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">???????</label>
                    <input
                      type="number"
                      value={editingProject.sort_order || 0}
                      onChange={(e) => setEditingProject({ ...editingProject, sort_order: parseInt(e.target.value || '0', 10) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">??? ??????</label>
                    <input
                      type="color"
                      value={editingProject.accent_color || '#3b82f6'}
                      onChange={(e) => setEditingProject({ ...editingProject, accent_color: e.target.value })}
                      className="w-full h-12 p-1 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">????? ????????</label>
                  <textarea
                    rows={3}
                    value={editingProject.short_description_ar || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, short_description_ar: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProject.is_visible}
                      onChange={(e) => setEditingProject({ ...editingProject, is_visible: e.target.checked })}
                      className="w-5 h-5 rounded-md border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm font-bold text-slate-700">????? ??????</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProject.is_featured}
                      onChange={(e) => setEditingProject({ ...editingProject, is_featured: e.target.checked })}
                      className="w-5 h-5 rounded-md border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm font-bold text-slate-700">????? ????</span>
                  </label>
                </div>

                <div className="pt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    ?????
                  </button>
                  <button
                    type="submit"
                    className="px-10 py-3 bg-brand-blue text-white rounded-2xl font-bold pixel-shadow-hover transition-all flex items-center gap-2"
                  >
                    <Save size={20} />
                    ??? ?????????
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingLink && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingLink(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900">
                  {editingLink.id ? '????? ???? ???' : '????? ???? ???'}
                </h2>
                <button onClick={() => setEditingLink(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveLink} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">??? ??????</label>
                    <input
                      required
                      value={editingLink.title_ar || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, title_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">???? ??????</label>
                    <input
                      required
                      value={editingLink.slug || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, slug: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">???????</label>
                    <input
                      type="number"
                      value={editingLink.sort_order || 0}
                      onChange={(e) => setEditingLink({ ...editingLink, sort_order: parseInt(e.target.value || '0', 10) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">????? ?????</label>
                    <select
                      value=""
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) return;
                        if (!linkProjectIds.includes(value)) {
                          setLinkProjectIds((prev) => [...prev, value]);
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">???? ???????</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title_ar}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {linkProjectIds.map((projectId) => {
                        const project = projects.find((item) => item.id === projectId);
                        if (!project) return null;
                        return (
                          <button
                            type="button"
                            key={projectId}
                            onClick={() => setLinkProjectIds((prev) => prev.filter((item) => item !== projectId))}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm"
                          >
                            {project.title_ar}
                            <X size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">????? ???????</label>
                    <input
                      type="datetime-local"
                      value={editingLink.starts_at || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, starts_at: e.target.value || null })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">????? ???????</label>
                    <input
                      type="datetime-local"
                      value={editingLink.ends_at || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, ends_at: e.target.value || null })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">????? ?????? ????????</label>
                    <textarea
                      rows={3}
                      value={editingLink.description_ar || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, description_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingLink.is_active}
                      onChange={(e) => setEditingLink({ ...editingLink, is_active: e.target.checked })}
                      className="w-5 h-5 rounded-md border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm font-bold text-slate-700">????? ??????</span>
                  </label>
                </div>

                <div className="pt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingLink(null)}
                    className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    ?????
                  </button>
                  <button
                    type="submit"
                    className="px-10 py-3 bg-brand-blue text-white rounded-2xl font-bold pixel-shadow-hover transition-all flex items-center gap-2"
                  >
                    <Save size={20} />
                    ??? ??????
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

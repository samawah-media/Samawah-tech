import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Link2Off,
  LogIn,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProjectCard, ShowcaseLink } from '../types';
import {
  consumeAdminRedirectResult,
  db,
  ensureFirebaseReady,
  getProjects,
  getShowcaseLinks,
  isAllowedAdminEmail,
  onAuthUserChanged,
  signInAdmin,
  signOutAdmin,
} from '../lib/firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const projectTemplate: Partial<ProjectCard> = {
  is_visible: true,
  is_featured: false,
  status: 'published',
  tags: [],
  sort_order: 1,
  accent_color: '#2563eb',
  cover_image_url: '/projects/contracts.png',
};

const linkTemplate: Partial<ShowcaseLink> = {
  is_active: true,
  sort_order: 1,
  title_ar: '',
  description_ar: '',
  project_ids: [],
  starts_at: null,
  ends_at: null,
};

function makeId(prefix: string) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Admin() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [links, setLinks] = useState<ShowcaseLink[]>([]);
  const [editingProject, setEditingProject] = useState<Partial<ProjectCard> | null>(null);
  const [editingLink, setEditingLink] = useState<Partial<ShowcaseLink> | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'links'>('projects');
  const [search, setSearch] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [notice, setNotice] = useState('');
  const [authError, setAuthError] = useState('');

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

      try {
        const redirectResult = await consumeAdminRedirectResult();
        if (active && redirectResult?.user) {
          setUser(redirectResult.user);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر إكمال تسجيل الدخول بعد الرجوع من Google.';
        if (active) {
          setAuthError(message);
        }
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

  useEffect(() => {
    (async () => {
      const [projectData, linkData] = await Promise.all([getProjects(), getShowcaseLinks()]);
      setProjects(projectData);
      setLinks(linkData);
      setLoading(false);
    })();
  }, []);

  const canEdit = !firebaseEnabled || Boolean(user && isAllowedAdminEmail(user.email));
  const isDemoMode = !firebaseEnabled;

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) =>
      [project.title_ar, project.slug, project.category, project.subtitle_ar]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [projects, search]);

  const filteredLinks = useMemo(() => {
    const term = linkSearch.trim().toLowerCase();
    if (!term) return links;
    return links.filter((item) =>
      [item.title_ar, item.slug, item.description_ar].join(' ').toLowerCase().includes(term),
    );
  }, [links, linkSearch]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const handleAdminSignIn = async () => {
    setAuthError('');
    try {
      await signInAdmin();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر بدء تسجيل الدخول.';
      setAuthError(message);
    }
  };

  const handleSaveProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProject) return;

    const now = new Date().toISOString();
    const projectData = {
      ...projectTemplate,
      ...editingProject,
      id: editingProject.id || makeId('project'),
      created_at: editingProject.created_at || now,
      updated_at: now,
      tags: Array.isArray(editingProject.tags) ? editingProject.tags : [],
    } as ProjectCard;

    if (db) {
      await setDoc(doc(db, 'projects', projectData.id), projectData);
    }

    setProjects((previous) => {
      const exists = previous.some((project) => project.id === projectData.id);
      if (exists) return previous.map((project) => (project.id === projectData.id ? projectData : project));
      return [...previous, projectData].sort((a, b) => a.sort_order - b.sort_order);
    });

    setEditingProject(null);
    showNotice('تم حفظ المشروع');
  };

  const handleSaveLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingLink) return;

    const now = new Date().toISOString();
    const linkData = {
      ...linkTemplate,
      ...editingLink,
      id: editingLink.id || makeId('link'),
      created_at: editingLink.created_at || now,
      updated_at: now,
      project_ids: selectedProjectIds,
    } as ShowcaseLink;

    if (db) {
      await setDoc(doc(db, 'showcase_links', linkData.id), linkData);
    }

    setLinks((previous) => {
      const exists = previous.some((item) => item.id === linkData.id);
      if (exists) return previous.map((item) => (item.id === linkData.id ? linkData : item));
      return [...previous, linkData].sort((a, b) => a.sort_order - b.sort_order);
    });

    setEditingLink(null);
    setSelectedProjectIds([]);
    showNotice('تم حفظ رابط العرض');
  };

  const toggleProjectVisibility = async (project: ProjectCard) => {
    const nextValue = !project.is_visible;
    if (db) {
      await updateDoc(doc(db, 'projects', project.id), {
        is_visible: nextValue,
        updated_at: new Date().toISOString(),
      });
    }
    setProjects((previous) =>
      previous.map((item) => (item.id === project.id ? { ...item, is_visible: nextValue } : item)),
    );
  };

  const toggleLinkStatus = async (item: ShowcaseLink) => {
    const nextValue = !item.is_active;
    if (db) {
      await updateDoc(doc(db, 'showcase_links', item.id), {
        is_active: nextValue,
        updated_at: new Date().toISOString(),
      });
    }
    setLinks((previous) =>
      previous.map((linkItem) => (linkItem.id === item.id ? { ...linkItem, is_active: nextValue } : linkItem)),
    );
  };

  const deleteProject = async (project: ProjectCard) => {
    if (!window.confirm(`حذف مشروع "${project.title_ar}"؟`)) return;
    if (db) await deleteDoc(doc(db, 'projects', project.id));
    setProjects((previous) => previous.filter((item) => item.id !== project.id));
    showNotice('تم حذف المشروع');
  };

  const deleteLink = async (item: ShowcaseLink) => {
    if (!window.confirm(`حذف رابط "${item.title_ar}"؟`)) return;
    if (db) await deleteDoc(doc(db, 'showcase_links', item.id));
    setLinks((previous) => previous.filter((linkItem) => linkItem.id !== item.id));
    showNotice('تم حذف الرابط');
  };

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/v/${slug}`);
    showNotice('تم نسخ الرابط');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (firebaseEnabled && !user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4" dir="rtl">
        <section className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">تسجيل دخول الأدمن</h1>
          <p className="mt-3 text-slate-500 leading-7">سجّل الدخول بحساب جوجل المصرّح له لإدارة المشاريع وروابط العرض.</p>
          <button
            onClick={handleAdminSignIn}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-bold"
          >
            <LogIn size={18} />
            الدخول بحساب Google
          </button>
          {authError ? (
            <p className="mt-4 text-sm leading-6 text-rose-600">{authError}</p>
          ) : null}
          <Link to="/" className="mt-6 block text-slate-500 text-sm underline">
            العودة للمعرض
          </Link>
        </section>
      </main>
    );
  }

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4" dir="rtl">
        <section className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">هذا الحساب غير مصرح له</h1>
          <p className="mt-3 text-slate-500 leading-7">الحساب الحالي ليس ضمن قائمة إيميلات الأدمن.</p>
          <button onClick={signOutAdmin} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold">
            تسجيل الخروج
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">لوحة إدارة سماوة</h1>
            <p className="mt-1 text-slate-500">تحكم في كروت المشاريع وروابط العرض المخصصة للزوار.</p>
            {user ? <p className="mt-1 text-xs text-slate-400">مسجل باسم {user.email}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 inline-flex items-center gap-2">
              <ArrowLeft size={18} />
              المعرض
            </Link>
            {user ? (
              <button onClick={signOutAdmin} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                خروج
              </button>
            ) : null}
            <button
              onClick={() => {
                if (activeTab === 'projects') {
                  setEditingProject({ ...projectTemplate, sort_order: projects.length + 1 });
                  return;
                }
                setEditingLink({ ...linkTemplate, sort_order: links.length + 1 });
                setSelectedProjectIds([]);
              }}
              className="px-5 py-2 bg-brand-blue text-white rounded-xl font-bold inline-flex items-center gap-2 pixel-shadow-hover"
            >
              <Plus size={19} />
              {activeTab === 'projects' ? 'مشروع جديد' : 'رابط جديد'}
            </button>
          </div>
        </header>

        {isDemoMode ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <div className="font-bold">وضع تجريبي</div>
            <p className="mt-1 leading-7">Firebase غير متصل، لذلك ستظهر البيانات الافتراضية فقط ولن تنتقل التعديلات لكل الزوار.</p>
          </div>
        ) : null}

        {notice ? (
          <div className="fixed bottom-5 left-5 z-[120] bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold">
            {notice}
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
            المشاريع
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={cn(
              'px-4 py-2 rounded-xl border text-sm font-bold',
              activeTab === 'links' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200',
            )}
          >
            روابط العرض
          </button>
        </div>

        {activeTab === 'projects' ? (
          <ProjectsTable
            projects={filteredProjects}
            search={search}
            onSearch={setSearch}
            onEdit={setEditingProject}
            onDelete={deleteProject}
            onToggle={toggleProjectVisibility}
          />
        ) : (
          <LinksTable
            links={filteredLinks}
            projects={projects}
            search={linkSearch}
            onSearch={setLinkSearch}
            onCopy={copyLink}
            onDelete={deleteLink}
            onToggle={toggleLinkStatus}
            onEdit={(item) => {
              setEditingLink(item);
              setSelectedProjectIds(item.project_ids);
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {editingProject ? (
          <ProjectModal
            project={editingProject}
            onChange={setEditingProject}
            onClose={() => setEditingProject(null)}
            onSubmit={handleSaveProject}
          />
        ) : null}

        {editingLink ? (
          <LinkModal
            item={editingLink}
            projects={projects}
            selectedProjectIds={selectedProjectIds}
            onProjectIdsChange={setSelectedProjectIds}
            onChange={setEditingLink}
            onClose={() => setEditingLink(null)}
            onSubmit={handleSaveLink}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function ProjectsTable({
  projects,
  search,
  onSearch,
  onEdit,
  onDelete,
  onToggle,
}: {
  projects: ProjectCard[];
  search: string;
  onSearch: (value: string) => void;
  onEdit: (project: ProjectCard) => void;
  onDelete: (project: ProjectCard) => void;
  onToggle: (project: ProjectCard) => void;
}) {
  return (
    <>
      <SearchBox value={search} onChange={onSearch} placeholder="ابحث في المشاريع..." />
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <TableHead>المشروع</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الظهور</TableHead>
                <TableHead align="left">إجراءات</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 min-w-[310px]">
                    <div className="flex items-center gap-4">
                      <img src={project.cover_image_url} className="w-20 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200" alt={project.title_ar} />
                      <div>
                        <div className="font-bold text-slate-900">{project.title_ar}</div>
                        <div className="text-xs text-slate-400 ltr:text-left">{project.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{project.category}</td>
                  <td className="px-6 py-4">
                    <StatusPill active={project.status === 'published'} label={project.status === 'published' ? 'منشور' : 'مسودة'} />
                  </td>
                  <td className="px-6 py-4">
                    <IconButton onClick={() => onToggle(project)} label={project.is_visible ? 'إخفاء' : 'إظهار'}>
                      {project.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </IconButton>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 text-slate-500">
                      <a href={project.project_url} target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-100 rounded-lg" title="فتح المشروع">
                        <ExternalLink size={18} />
                      </a>
                      <IconButton onClick={() => onEdit(project)} label="تعديل">
                        <Edit3 size={18} />
                      </IconButton>
                      <IconButton onClick={() => onDelete(project)} label="حذف" danger>
                        <Trash2 size={18} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function LinksTable({
  links,
  projects,
  search,
  onSearch,
  onCopy,
  onEdit,
  onDelete,
  onToggle,
}: {
  links: ShowcaseLink[];
  projects: ProjectCard[];
  search: string;
  onSearch: (value: string) => void;
  onCopy: (slug: string) => void;
  onEdit: (item: ShowcaseLink) => void;
  onDelete: (item: ShowcaseLink) => void;
  onToggle: (item: ShowcaseLink) => void;
}) {
  return (
    <>
      <SearchBox value={search} onChange={onSearch} placeholder="ابحث في روابط العرض..." />
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <TableHead>الرابط</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>المشاريع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead align="left">إجراءات</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 min-w-[220px]">
                    <div className="font-bold text-slate-900">/v/{item.slug}</div>
                    <div className="text-xs text-slate-400">{item.title_ar}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 min-w-[260px]">{item.description_ar}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {item.project_ids
                      .map((id) => projects.find((project) => project.id === id)?.title_ar)
                      .filter(Boolean)
                      .join('، ') || 'كل المشاريع'}
                  </td>
                  <td className="px-6 py-4">
                    <IconButton onClick={() => onToggle(item)} label={item.is_active ? 'تعطيل' : 'تفعيل'}>
                      {item.is_active ? <LinkIcon size={18} /> : <Link2Off size={18} />}
                    </IconButton>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 text-slate-500">
                      <IconButton onClick={() => onCopy(item.slug)} label="نسخ الرابط">
                        <Copy size={18} />
                      </IconButton>
                      <a href={`/v/${item.slug}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-100 rounded-lg" title="معاينة">
                        <ExternalLink size={18} />
                      </a>
                      <IconButton onClick={() => onEdit(item)} label="تعديل">
                        <Edit3 size={18} />
                      </IconButton>
                      <IconButton onClick={() => onDelete(item)} label="حذف" danger>
                        <Trash2 size={18} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ProjectModal({
  project,
  onChange,
  onClose,
  onSubmit,
}: {
  project: Partial<ProjectCard>;
  onChange: (project: Partial<ProjectCard>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Modal title={project.id ? 'تعديل مشروع' : 'مشروع جديد'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TextField label="اسم المشروع" required value={project.title_ar || ''} onChange={(value) => onChange({ ...project, title_ar: value })} />
          <TextField label="المعرف Slug" required value={project.slug || ''} onChange={(value) => onChange({ ...project, slug: value })} />
          <TextField label="العنوان الفرعي" value={project.subtitle_ar || ''} onChange={(value) => onChange({ ...project, subtitle_ar: value })} />
          <TextField label="رابط المشروع" required value={project.project_url || ''} onChange={(value) => onChange({ ...project, project_url: value })} />
          <TextField label="مسار الصورة" required value={project.cover_image_url || ''} onChange={(value) => onChange({ ...project, cover_image_url: value })} />
          <TextField label="التصنيف" value={project.category || ''} onChange={(value) => onChange({ ...project, category: value })} />
          <TextField label="الترتيب" type="number" value={String(project.sort_order || 0)} onChange={(value) => onChange({ ...project, sort_order: Number(value || 0) })} />
          <div>
            <label className="text-sm font-bold text-slate-700">لون التمييز</label>
            <input
              type="color"
              value={project.accent_color || '#2563eb'}
              onChange={(event) => onChange({ ...project, accent_color: event.target.value })}
              className="mt-2 w-full h-12 p-1 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
        </div>

        <TextArea label="وصف مختصر" value={project.short_description_ar || ''} onChange={(value) => onChange({ ...project, short_description_ar: value })} />
        <TextField
          label="الوسوم"
          value={(project.tags || []).join(', ')}
          onChange={(value) => onChange({ ...project, tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
        />

        <div className="flex flex-wrap items-center gap-5 bg-slate-50 rounded-2xl p-4">
          <CheckField label="ظاهر للزوار" checked={Boolean(project.is_visible)} onChange={(checked) => onChange({ ...project, is_visible: checked })} />
          <CheckField label="مشروع مميز" checked={Boolean(project.is_featured)} onChange={(checked) => onChange({ ...project, is_featured: checked })} />
          <label className="text-sm font-bold text-slate-700">
            حالة النشر
            <select
              value={project.status || 'published'}
              onChange={(event) => onChange({ ...project, status: event.target.value as ProjectCard['status'] })}
              className="block mt-2 px-4 py-3 bg-white border border-slate-200 rounded-xl"
            >
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
              <option value="archived">مؤرشف</option>
            </select>
          </label>
        </div>

        <ModalActions onClose={onClose} />
      </form>
    </Modal>
  );
}

function LinkModal({
  item,
  projects,
  selectedProjectIds,
  onProjectIdsChange,
  onChange,
  onClose,
  onSubmit,
}: {
  item: Partial<ShowcaseLink>;
  projects: ProjectCard[];
  selectedProjectIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  onChange: (item: Partial<ShowcaseLink>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Modal title={item.id ? 'تعديل رابط عرض' : 'رابط عرض جديد'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TextField label="عنوان الرابط" required value={item.title_ar || ''} onChange={(value) => onChange({ ...item, title_ar: value })} />
          <TextField label="المعرف Slug" required value={item.slug || ''} onChange={(value) => onChange({ ...item, slug: value })} />
          <TextField label="الترتيب" type="number" value={String(item.sort_order || 0)} onChange={(value) => onChange({ ...item, sort_order: Number(value || 0) })} />
          <div className="flex items-end">
            <CheckField label="الرابط فعّال" checked={Boolean(item.is_active)} onChange={(checked) => onChange({ ...item, is_active: checked })} />
          </div>
          <TextField label="يبدأ من" type="datetime-local" value={item.starts_at || ''} onChange={(value) => onChange({ ...item, starts_at: value || null })} />
          <TextField label="ينتهي في" type="datetime-local" value={item.ends_at || ''} onChange={(value) => onChange({ ...item, ends_at: value || null })} />
        </div>

        <TextArea label="وصف الرابط" value={item.description_ar || ''} onChange={(value) => onChange({ ...item, description_ar: value })} />

        <div>
          <label className="text-sm font-bold text-slate-700">المشاريع التي تظهر لهذا الرابط</label>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((project) => {
              const checked = selectedProjectIds.includes(project.id);
              return (
                <label key={project.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onProjectIdsChange([...selectedProjectIds, project.id]);
                        return;
                      }
                      onProjectIdsChange(selectedProjectIds.filter((id) => id !== project.id));
                    }}
                    className="w-5 h-5 rounded-md border-slate-300 text-brand-blue focus:ring-brand-blue"
                  />
                  <span className="font-bold text-slate-800">{project.title_ar}</span>
                </label>
              );
            })}
          </div>
        </div>

        <ModalActions onClose={onClose} />
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" />
      <motion.section
        initial={{ scale: 0.96, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 18 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full" aria-label="إغلاق">
            <X size={24} />
          </button>
        </div>
        {children}
      </motion.section>
    </div>
  );
}

function ModalActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="pt-4 flex items-center justify-end gap-3">
      <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl">
        إلغاء
      </button>
      <button type="submit" className="px-8 py-3 bg-brand-blue text-white rounded-2xl font-bold pixel-shadow-hover flex items-center gap-2">
        <Save size={20} />
        حفظ
      </button>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-6">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pr-12 pl-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all shadow-sm"
      />
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/10 outline-none resize-none"
      />
    </label>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-5 h-5 rounded-md border-slate-300 text-brand-blue focus:ring-brand-blue"
      />
      {label}
    </label>
  );
}

function TableHead({ children, align = 'right' }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return (
    <th className={cn('px-6 py-4 text-xs font-bold text-slate-500', align === 'left' ? 'text-left' : 'text-right')}>
      {children}
    </th>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={cn('text-xs font-bold px-3 py-1 rounded-full border', active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100')}>
      {label}
    </span>
  );
}

function IconButton({ children, onClick, label, danger = false }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn('p-2 rounded-lg transition-colors', danger ? 'hover:bg-rose-100 hover:text-rose-600' : 'hover:bg-brand-blue/10 hover:text-brand-blue')}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

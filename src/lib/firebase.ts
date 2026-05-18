import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithRedirect,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, limit, Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { ProjectCard, ShowcaseLink } from '../types';
import { FALLBACK_LINKS, SEED_PROJECTS } from '../constants';
import { getLocalLinks, getLocalProjects } from './localDrafts';

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;
export let storage: FirebaseStorage | null = null;
let configuredAdminEmails: string[] = [];
const firebaseEnv = import.meta.env;

type FirebaseJsonConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  adminEmails?: string[];
  firestoreDatabaseId?: string;
};

const adminEmails = (firebaseEnv.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

function hasBrokenArabic(value?: string | null): boolean {
  if (!value) return false;
  return value.includes('???') || /[ØÙÃƒÃ‚]/.test(value);
}

function repairProjectText(project: ProjectCard): ProjectCard {
  const fallback = SEED_PROJECTS.find((item) => item.id === project.id || item.slug === project.slug);
  if (!fallback) return project;

  const shouldUseSeedCover =
    ['sadeed', 'inviteauto', 'ratbha-ai'].includes(project.slug) &&
    project.cover_image_url.startsWith('/projects/') &&
    project.cover_image_url !== fallback.cover_image_url;
  const normalizedProject = shouldUseSeedCover
    ? { ...project, cover_image_url: fallback.cover_image_url }
    : project;

  if (
    hasBrokenArabic(normalizedProject.title_ar) ||
    hasBrokenArabic(normalizedProject.subtitle_ar) ||
    hasBrokenArabic(normalizedProject.short_description_ar) ||
    hasBrokenArabic(normalizedProject.category)
  ) {
    return {
      ...normalizedProject,
      title_ar: fallback.title_ar,
      subtitle_ar: fallback.subtitle_ar,
      short_description_ar: fallback.short_description_ar,
      category: fallback.category,
      tags: fallback.tags,
    };
  }

  return normalizedProject;
}

function repairLinkText(link: ShowcaseLink): ShowcaseLink {
  const fallback = FALLBACK_LINKS.find((item) => item.id === link.id || item.slug === link.slug);
  if (!fallback) return link;

  if (hasBrokenArabic(link.title_ar) || hasBrokenArabic(link.description_ar)) {
    return {
      ...link,
      title_ar: fallback.title_ar,
      description_ar: fallback.description_ar,
    };
  }

  return link;
}

function projectKey(project: Pick<ProjectCard, 'id' | 'slug'>) {
  return project.id || project.slug;
}

function linkKey(link: Pick<ShowcaseLink, 'id' | 'slug'>) {
  return link.id || link.slug;
}

function mergeProjects(base: ProjectCard[], local: ProjectCard[]) {
  if (local.length === 0) return base;
  const map = new Map(base.map((project) => [projectKey(project), project]));
  local.forEach((project) => {
    const existingEntry = Array.from(map.entries()).find(([, current]) => current.slug === project.slug);
    if (existingEntry) map.delete(existingEntry[0]);
    map.set(projectKey(project), project);
  });
  return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
}

function mergeLinks(base: ShowcaseLink[], local: ShowcaseLink[]) {
  if (local.length === 0) return base;
  const map = new Map(base.map((link) => [linkKey(link), link]));
  local.forEach((link) => {
    const existingEntry = Array.from(map.entries()).find(([, current]) => current.slug === link.slug);
    if (existingEntry) map.delete(existingEntry[0]);
    map.set(linkKey(link), link);
  });
  return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
}

async function initFirebase() {
  if (app) return;

  try {
    // @ts-ignore JSON config is generated for the deployed app.
    const config = await import(/* @vite-ignore */ '../../firebase-applet-config.json');
    const firebaseConfig = config.default as FirebaseJsonConfig;

    configuredAdminEmails = Array.isArray(firebaseConfig.adminEmails)
      ? firebaseConfig.adminEmails
          .map((email: string) => email.trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (firebaseConfig && firebaseConfig.apiKey !== 'DUMMY') {
      app = initializeApp(firebaseConfig);
      db = firebaseConfig.firestoreDatabaseId
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);
      auth = getAuth(app);
      storage = getStorage(app);
      await setPersistence(auth, browserLocalPersistence);
    }
  } catch (error) {
    console.warn('Firebase config not loaded, using seed data.', error);
  }
}

export async function ensureFirebaseReady(): Promise<boolean> {
  await initFirebase();
  return Boolean(db && auth);
}

export async function getProjects(): Promise<ProjectCard[]> {
  await initFirebase();

  const localProjects = getLocalProjects();
  if (!db) return mergeProjects(SEED_PROJECTS, localProjects);

  try {
    const q = query(collection(db, 'projects'), orderBy('sort_order', 'asc'));
    const snapshot = await getDocs(q);
    const projects = snapshot.docs
      .map((docRef) => ({ id: docRef.id, ...docRef.data() } as ProjectCard))
      .map(repairProjectText);
    return mergeProjects(mergeProjects(SEED_PROJECTS, projects), localProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return mergeProjects(SEED_PROJECTS, localProjects);
  }
}

export async function getProjectById(projectId: string): Promise<ProjectCard | null> {
  const projects = await getProjects();
  return projects.find((project) => project.id === projectId || project.slug === projectId) || null;
}

export async function getShowcaseLinks(): Promise<ShowcaseLink[]> {
  await initFirebase();

  const localLinks = getLocalLinks();
  if (!db) return mergeLinks(FALLBACK_LINKS, localLinks);

  try {
    const q = query(collection(db, 'showcase_links'), orderBy('sort_order', 'asc'));
    const snapshot = await getDocs(q);
    const links = snapshot.docs
      .map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<ShowcaseLink, 'id'>) }))
      .map(repairLinkText);
    return mergeLinks(mergeLinks(FALLBACK_LINKS, links), localLinks);
  } catch (error) {
    console.error('Error fetching showcase links:', error);
    return mergeLinks(FALLBACK_LINKS, localLinks);
  }
}

export async function getShowcaseLinkBySlug(slug: string): Promise<ShowcaseLink | null> {
  await initFirebase();

  if (!db) {
    return FALLBACK_LINKS.find((link) => link.slug === slug) || null;
  }

  const links = await getShowcaseLinks();
  return links.find((link) => link.slug === slug) || null;
}

export function isFirebaseReady(): boolean {
  return Boolean(db && auth);
}

export async function checkFirestoreAccess(): Promise<boolean> {
  await initFirebase();
  if (!db) return false;

  try {
    await getDocs(query(collection(db, 'projects'), limit(1)));
    return true;
  } catch (error) {
    console.error('Firestore access check failed:', error);
    return false;
  }
}

export function isAllowedAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const allowedEmails = adminEmails.length > 0 ? adminEmails : configuredAdminEmails;
  if (allowedEmails.length === 0) return true;
  return allowedEmails.includes(email.toLowerCase());
}

export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  if (!auth) {
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function consumeAdminRedirectResult() {
  await initFirebase();
  if (!auth) return null;
  return getRedirectResult(auth);
}

export async function signInAdmin() {
  await initFirebase();
  if (!auth) return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  await signInWithRedirect(auth, provider);
}

export async function signInAdminWithPassword(email: string, password: string) {
  await initFirebase();
  if (!auth) return null;
  return signInWithEmailAndPassword(auth, email, password);
}

export async function uploadProjectImage(file: File, projectSlugOrId: string): Promise<string> {
  await initFirebase();
  if (!storage || !auth?.currentUser) {
    throw new Error('Firebase Storage is not ready for uploads.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeProjectId = (projectSlugOrId || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const imageRef = ref(storage, `projects/${safeProjectId || 'project'}/${Date.now()}.${extension}`);

  await uploadBytes(imageRef, file, {
    contentType: file.type || `image/${extension}`,
  });

  return getDownloadURL(imageRef);
}

export async function signOutAdmin() {
  if (!auth) return;
  await signOut(auth);
}

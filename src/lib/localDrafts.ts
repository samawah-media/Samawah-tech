import { ProjectCard, ShowcaseLink } from '../types';

const PROJECTS_KEY = 'samawah-tech-projects';
const LINKS_KEY = 'samawah-tech-showcase-links';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readJson<T>(key: string): T[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (error) {
    console.warn(`Could not read ${key} from localStorage`, error);
    return [];
  }
}

function writeJson<T>(key: string, value: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalProjects(): ProjectCard[] {
  return readJson<ProjectCard>(PROJECTS_KEY);
}

export function getLocalLinks(): ShowcaseLink[] {
  return readJson<ShowcaseLink>(LINKS_KEY);
}

export function saveLocalProject(project: ProjectCard) {
  const projects = getLocalProjects();
  const exists = projects.some((item) => item.id === project.id);
  const next = exists ? projects.map((item) => (item.id === project.id ? project : item)) : [...projects, project];
  writeJson(PROJECTS_KEY, next.sort((a, b) => a.sort_order - b.sort_order));
}

export function saveLocalLink(link: ShowcaseLink) {
  const links = getLocalLinks();
  const exists = links.some((item) => item.id === link.id);
  const next = exists ? links.map((item) => (item.id === link.id ? link : item)) : [...links, link];
  writeJson(LINKS_KEY, next.sort((a, b) => a.sort_order - b.sort_order));
}

export function deleteLocalProject(projectId: string) {
  writeJson(PROJECTS_KEY, getLocalProjects().filter((project) => project.id !== projectId));
}

export function deleteLocalLink(linkId: string) {
  writeJson(LINKS_KEY, getLocalLinks().filter((link) => link.id !== linkId));
}

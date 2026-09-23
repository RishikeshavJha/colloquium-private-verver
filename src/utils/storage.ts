import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface Person {
  name: string;
  mobile: string;
  email: string;
  institution: string;
  department: string;
  year: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  courseType?: 'Degree' | 'Diploma' | '';
  github: string;
  linkedin: string;
}

export interface Abstract {
  id: string;
  title: string;
  track: string;
  filename: string;
  size: number;
  date: string;
}

export interface Passport {
  category: string;
  track: string;
  team: string;
  people: Person[];
  registered: boolean;
  abstracts: Abstract[];
}

// ─── Storage keys (local cache only — Firestore is the source of truth) ───────
const STORAGE_KEY = 'vikas-2026-passport-v5';
const AUTH_KEY = 'vikas-2026-auth-v5';

export function emptyPerson(): Person {
  return { name: '', mobile: '', email: '', institution: '', department: '', year: '', gender: '', courseType: '', github: '', linkedin: '' };
}

export function blankPassport(): Passport {
  return {
    category: '',
    track: '',
    team: '',
    people: [emptyPerson()],
    registered: false,
    abstracts: [],
  };
}

export function savePassport(data: Passport): void {
  try {
    const isIndividual = data.category && data.category !== 'UG';
    const sanitized: Passport = {
      ...data,
      team: isIndividual ? '' : data.team,
      people: isIndividual ? [data.people[0] || emptyPerson()] : data.people,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // silently fail if storage is full
  }
}

export function loadPassport(): Passport {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankPassport();
    const parsed = JSON.parse(raw);
    const isIndividual = parsed.category && parsed.category !== 'UG';
    const rawPeople = Array.isArray(parsed.people)
      ? parsed.people.map((p: Partial<Person>) => ({ ...emptyPerson(), ...p }))
      : [emptyPerson()];
    return {
      ...blankPassport(),
      ...parsed,
      team: isIndividual ? '' : (parsed.team || ''),
      people: isIndividual ? [rawPeople[0] || emptyPerson()] : rawPeople,
      abstracts: Array.isArray(parsed.abstracts) ? parsed.abstracts : [],
    };
  } catch {
    return blankPassport();
  }
}

export function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

export function validatePerson(p: Person): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!p.name.trim()) errors.name = 'Name is required.';
  else if (!/^[A-Za-z ]+$/.test(p.name)) errors.name = 'Letters and spaces only.';
  if (!p.mobile.trim()) errors.mobile = 'Mobile is required.';
  else if (!/^[0-9]{10}$/.test(p.mobile)) errors.mobile = 'Exactly 10 digits.';
  if (!p.email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.email = 'Enter a valid email.';
  if (!p.institution.trim()) errors.institution = 'Institution is required.';
  if (!p.department.trim()) errors.department = 'Department is required.';
  if (!p.year) errors.year = 'Select a year.';
  return errors;
}

export function validProfile(data: Passport): boolean {
  if (!data.category || !data.track) return false;
  if (data.category === 'UG' && !data.team.trim()) return false;
  return data.people.every(p => Object.keys(validatePerson(p)).length === 0);
}

export const yearOptionsFor = (category: string, courseType?: string) => {
  if (category === 'UG') {
    if (courseType === 'Diploma') {
      return ['1st Year', '2nd Year', '3rd Year'];
    }
    // Default or Degree
    return ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  }
  if (category === 'PG') {
    return ['1st Year', '2nd Year'];
  }
  return ['PhD Scholar / Candidate', 'Post-Doctoral Researcher'];
};

export const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029VbDzr4oFMqrbOY62351F';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  degree?: string;
  isNewUser?: boolean;
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    // silently fail
  }
}

/** isEmailRegistered is now handled by Firestore (see lib/db.ts).
 *  This local version is kept as a fast synchronous fallback for the UI only. */
export function isEmailRegistered(_email: string): boolean {
  // Always returns false now — real check is done async via Firestore in GoogleAuthModal
  return false;
}

export function clearDatabase(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTH_KEY);
    // Also sign out from Firebase
    signOut(auth).catch(() => {});
  } catch {
    // silently fail
  }
}

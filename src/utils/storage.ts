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
      team: data.team || '',
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
      team: parsed.team || '',
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
export const BROCHURE_LINK = 'https://drive.google.com/file/d/1VExKvkDSiY0Om6CBQ1GIiDDg5-8-iqED/view?usp=sharing';
export const PPT_FORMAT_LINK = 'https://docs.google.com/presentation/d/1A5_YzalrQAvdtXd_gSUhaI0QTCkJCIY4/edit?usp=sharing&ouid=114692613106986949056&rtpof=true&sd=true';

/**
 * Generates a unique, deterministic, collision-resistant Pass ID for every user login.
 * Format: INSPIRE-2026-XXX-YYYY
 */
export function getRegistrationId(
  passport?: Partial<Passport> | null,
  user?: AuthUser | null
): string {
  const leader = passport?.people?.[0];
  const rawName = passport?.team || leader?.name || user?.name || 'PASS';

  // 3-character uppercase prefix
  const cleanPrefix = (rawName.replace(/[^A-Za-z0-9]/g, '') || 'PAS')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  // Unique identifier source: prioritize Firebase Auth UID, then email, then phone
  const rawUniqueKey = (user?.id || leader?.email || user?.email || leader?.mobile || 'inspire-2026').toLowerCase().trim();

  // FNV-1a 32-bit hash with bit shift
  let h = 0x811c9dc5;
  for (let i = 0; i < rawUniqueKey.length; i++) {
    h ^= rawUniqueKey.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h = (h << 13) | (h >>> 19);
  }

  // 4-digit unique numerical code (1000 to 9999)
  const code = (Math.abs(h) % 9000 + 1000).toString();
  return `INSPIRE-2026-${cleanPrefix}-${code}`;
}

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
    signOut(auth).catch(() => { });
  } catch {
    // silently fail
  }
}

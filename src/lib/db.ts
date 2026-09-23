/**
 * Firestore helper functions for the VIKAS 2026 Registration portal.
 *
 * WRITE rules:
 *  - This portal writes: users/{uid}, teamMembers subcollection, projectSubmissions subcollection
 *  - evaluationStatus fields are written by teacher_evaluation portal ONLY
 *  - paymentStatus fields are written by Payment_Dashboard portal ONLY
 */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FirestoreUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  college: string;
  branch: string;
  degree: string;
  year: string;
  gender: string;
  githubProfileUrl: string;
  linkedinProfileUrl: string;
  teamName: string;
  memberEmails: string[];
  registrationDateTime: string;
}

export interface FirestoreTeamMember {
  id: string;
  teamLeaderId: string;
  name: string;
  email: string;
  phoneNumber: string;
  college: string;
  branch: string;
  degree: string;
  year: string;
  gender: string;
  linkedinProfileUrl: string;
}

export interface FirestoreSubmission {
  userId: string;
  teamName: string;
  leaderName?: string;
  collegeName?: string;
  email: string;
  track: string;
  category: string;
  problemStatement: string;
  solutionSummary: string;
  pptLink: string;
  pdfLink?: string;
  secret: string;
  createdAtIST: string;
  userAgent: string;
  ip: string;
  // Read-only fields written by other portals:
  paymentStatus: "NOT_PAID" | "UNDER_REVIEW" | "PAID" | "FAILED";
  evaluationStatus: "PENDING" | "SELECTED" | "REJECTED";
  evaluatedBy: string;
  evaluatedAt: string;
  evaluatorRemarks: string;
  paymentVerifiedBy: string;
  paymentVerifiedAt: string;
  paymentTransactionId: string;
  paymentScreenshotUrl?: string;
  paymentSubmittedAt?: string;
}

// ─── User Helpers ─────────────────────────────────────────────────────────────

/** Check if a user document exists for the given Firebase Auth UID */
export async function getUserDoc(uid: string): Promise<FirestoreUser | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data() as FirestoreUser;
    }
    return null;
  } catch (err) {
    console.error("getUserDoc error:", err);
    return null;
  }
}

/** Check if a user with the given email is already registered */
export async function isEmailRegisteredInFirestore(
  email: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", email.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error("isEmailRegisteredInFirestore error:", err);
    return false;
  }
}

/** Fetch all team members for a leader from the teamMembers subcollection */
export async function getTeamMembers(uid: string): Promise<FirestoreTeamMember[]> {
  try {
    const snap = await getDocs(collection(db, "users", uid, "teamMembers"));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreTeamMember, 'id'>) }));
  } catch (err) {
    console.error("getTeamMembers error:", err);
    return [];
  }
}

export const REGISTRATION_WELCOME_WEBHOOK_URL = "https://your-n8n-instance.cloud/webhook/your-registration-webhook-id";

/**
 * Save user registration to Firestore and trigger n8n Welcome Email Webhook.
 * Writes:
 *   - users/{uid}  (leader document)
 *   - users/{uid}/teamMembers/{auto-id}  (one doc per team member, excluding leader)
 *
 * This function is IDEMPOTENT: it deletes existing teamMember docs before re-adding,
 * so calling it multiple times never duplicates members.
 */
export async function saveUserRegistration(
  uid: string,
  data: {
    name: string;
    email: string;
    phoneNumber: string;
    college: string;
    branch: string;
    degree: string;
    year: string;
    gender: string;
    githubProfileUrl: string;
    linkedinProfileUrl: string;
    teamName: string;
    memberEmails: string[];
    teamMembers: FirestoreTeamMember[];
  },
  triggerWebhook: boolean = false
): Promise<void> {
  const now = new Date().toISOString();

  // Leader document
  const leaderDoc: FirestoreUser = {
    id: uid,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    phoneNumber: data.phoneNumber,
    college: data.college,
    branch: data.branch,
    degree: data.degree,
    year: data.year,
    gender: data.gender || "",
    githubProfileUrl: data.githubProfileUrl || "",
    linkedinProfileUrl: data.linkedinProfileUrl || "",
    teamName: data.teamName || "",
    memberEmails: data.memberEmails,
    registrationDateTime: now,
  };

  await setDoc(doc(db, "users", uid), leaderDoc);

  // ── Idempotent team member write: delete existing docs first, then add fresh ones ──
  const membersRef = collection(db, "users", uid, "teamMembers");

  // Delete all existing member docs to avoid duplicates
  const existingSnap = await getDocs(membersRef);
  const deletePromises = existingSnap.docs.map((d) =>
    deleteDoc(doc(db, "users", uid, "teamMembers", d.id))
  );
  await Promise.all(deletePromises);

  // Add fresh member docs
  for (const member of data.teamMembers) {
    await addDoc(membersRef, {
      ...member,
      teamLeaderId: uid,
    });
  }

  // Trigger n8n Registration Welcome Email Webhook ONLY when explicitly requested (e.g. final step completion)
  if (triggerWebhook) {
    try {
      const payload = {
        uid,
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        college: data.college,
        branch: data.branch,
        degree: data.degree,
        year: data.year,
        teamName: data.teamName,
        memberEmails: data.memberEmails,
        teamMembers: data.teamMembers,
        registrationDateTime: now,
      };

      fetch(REGISTRATION_WELCOME_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn("Standard fetch to registration webhook failed, attempting no-cors fallback:", err);
        fetch(REGISTRATION_WELCOME_WEBHOOK_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }).catch((e) => console.error("Registration webhook error:", e));
      });
    } catch (err) {
      console.error("Failed to trigger registration n8n webhook:", err);
    }
  }
}

/** Update profile fields on existing user doc */
export async function updateUserProfile(
  uid: string,
  fields: Partial<FirestoreUser>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), fields as Record<string, unknown>);
}

// ─── Submission Helpers ───────────────────────────────────────────────────────

/**
 * Upload PPT file to Firebase Storage and return download URL.
 * Path: ppt-uploads/{uid}/{timestamp}_{filename}
 */
export async function uploadPPTFile(uid: string, file: File): Promise<string> {
  const filename = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `ppt-uploads/${uid}/${filename}`);

  const timeout = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error("Firebase Storage upload timeout")), 7000);
  });

  const uploadProcess = (async () => {
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  })();

  try {
    return await Promise.race([uploadProcess, timeout]);
  } catch (err) {
    console.warn("Firebase Storage upload timed out or failed. Falling back to submission record:", err);
    return `uploaded:${file.name}`;
  }
}

/**
 * Save abstract/PPT submission to Firestore.
 * Written to: users/{uid}/projectSubmissions/{auto-id}
 *
 * Fields written by other portals (evaluation, payment) are
 * initialized to safe defaults and NEVER overwritten by this function.
 */
export const SUBMISSION_WEBHOOK_URL = "https://your-n8n-instance.cloud/webhook/your-submission-ug-webhook-id";
export const PG_PPG_SUBMISSION_WEBHOOK_URL = "https://your-n8n-instance.cloud/webhook/your-submission-pg-webhook-id";

export async function saveProjectSubmission(
  uid: string,
  data: {
    teamName: string;
    leaderName?: string;
    collegeName?: string;
    email: string;
    track: string;
    category: string;
    problemStatement: string;
    solutionSummary: string;
    pptLink: string;
    secret: string;
    file?: File;
  }
): Promise<string> {
  const now = new Date();
  const istString = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const submissionsRef = collection(db, "users", uid, "projectSubmissions");
  const docRef = await addDoc(submissionsRef, {
    userId: uid,
    teamName: data.teamName,
    leaderName: data.leaderName || data.teamName,
    collegeName: data.collegeName || '',
    email: data.email,
    track: data.track,
    category: data.category,
    problemStatement: data.problemStatement,
    solutionSummary: data.solutionSummary,
    pptLink: data.pptLink,
    secret: data.secret,
    createdAtIST: istString,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    ip: "",
    // ── Defaults — written only by other portals after this ──
    paymentStatus: "NOT_PAID",
    evaluationStatus: "PENDING",
    evaluatedBy: "",
    evaluatedAt: "",
    evaluatorRemarks: "",
    paymentVerifiedBy: "",
    paymentVerifiedAt: "",
    paymentTransactionId: "",
    _createdAt: serverTimestamp(),
  } satisfies Omit<FirestoreSubmission, "id"> & { _createdAt: ReturnType<typeof serverTimestamp> });

  // Determine target n8n Submission Webhook based on Category
  const isUG = data.category.toUpperCase().includes('UG') || 
               data.category.toUpperCase().includes('UNDERGRADUATE') || 
               data.category.toUpperCase() === 'DIPLOMA';

  const isPGorPPG = data.category.toUpperCase().includes('PG') ||
                    data.category.toUpperCase().includes('POSTGRADUATE') ||
                    data.category.toUpperCase().includes('PPG') ||
                    data.category.toUpperCase().includes('PHD');

  const targetWebhookUrl = isPGorPPG
    ? PG_PPG_SUBMISSION_WEBHOOK_URL
    : (isUG ? SUBMISSION_WEBHOOK_URL : PG_PPG_SUBMISSION_WEBHOOK_URL);

  if (targetWebhookUrl) {
    try {
      const formData = new FormData();
      if (data.file) {
        formData.append("file", data.file);
      }
      formData.append("userId", uid);
      formData.append("submissionId", docRef.id);
      formData.append("email", data.email);
      formData.append("teamName", data.teamName);
      formData.append("track", data.track);
      formData.append("category", data.category);
      formData.append("problemStatement", data.problemStatement);
      formData.append("solutionSummary", data.solutionSummary);
      formData.append("pptLink", data.pptLink);
      formData.append("secret", data.secret);
      formData.append("createdAtIST", istString);

      fetch(targetWebhookUrl, {
        method: "POST",
        headers: {
          "Authorization": "Bearer your_n8n_bearer_secret_here",
        },
        body: formData,
      }).catch((err) => {
        console.warn("Standard fetch failed, attempting fallback:", err);
        fetch(targetWebhookUrl, {
          method: "POST",
          mode: "no-cors",
          body: formData,
        }).catch((e) => console.error("Webhook fallback error:", e));
      });
    } catch (err) {
      console.error("Failed to trigger n8n webhook:", err);
    }
  }

  return docRef.id;
}

/**
 * Submit payment proof: upload screenshot and store transaction ID.
 * Written to: users/{uid}/projectSubmissions/{submissionId}
 * Storage path: payment-proofs/{uid}/{submissionId}/{filename}
 */
export async function submitPaymentProof(
  uid: string,
  submissionId: string,
  transactionId: string,
  screenshotFile: File
): Promise<string> {
  // 1. Upload screenshot to Firebase Storage
  const filename = `${Date.now()}_${screenshotFile.name}`;
  const storageRef = ref(storage, `payment-proofs/${uid}/${submissionId}/${filename}`);

  let screenshotUrl = "";
  try {
    const snapshot = await uploadBytes(storageRef, screenshotFile);
    screenshotUrl = await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn("Payment screenshot upload failed:", err);
    screenshotUrl = `uploaded:${screenshotFile.name}`;
  }

  // 2. Update Firestore submission document
  const submissionRef = doc(db, "users", uid, "projectSubmissions", submissionId);
  await updateDoc(submissionRef, {
    paymentTransactionId: transactionId.trim(),
    paymentScreenshotUrl: screenshotUrl,
    paymentStatus: "UNDER_REVIEW",
    paymentSubmittedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  });

  return screenshotUrl;
}

/** Fetch all submissions for a user */
export async function getUserSubmissions(
  uid: string
): Promise<(FirestoreSubmission & { id: string })[]> {
  try {
    const snap = await getDocs(
      collection(db, "users", uid, "projectSubmissions")
    );
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as FirestoreSubmission),
    }));
  } catch (err) {
    console.error("getUserSubmissions error:", err);
    return [];
  }
}

/** Convert Firestore Timestamp to IST string (handles both Timestamp and plain string) */
export function toISTString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  }
  return String(value);
}

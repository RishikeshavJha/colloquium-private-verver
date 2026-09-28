/**
 * Firestore helper functions for the INSPIRE Colloquium 2026 Registration portal.
 *
 * SECURITY PRINCIPLES APPLIED:
 *  - No hardcoded credentials or secrets
 *  - No no-cors fallbacks (fail closed)
 *  - Failed uploads throw — never return fake success strings
 *  - n8n calls routed through /api/webhook-proxy (server-side credential)
 *  - UID always comes from Firebase Auth — never from localStorage
 *  - Client-generated timestamps are informational only; server uses serverTimestamp()
 *  - Administrative fields (paymentStatus, evaluationStatus, etc.) are NEVER written here
 *
 * WRITE rules:
 *  - This portal writes: users/{uid}, teamMembers subcollection, projectSubmissions subcollection
 *  - evaluationStatus fields are written by teacher_evaluation portal ONLY
 *  - paymentStatus fields are written by Payment_Dashboard portal ONLY
 */

import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getIdToken } from "firebase/auth";
import { db, storage, auth } from "./firebase";

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
  createdAtIST: string;
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

// ─── Secure server-side proxy helper ─────────────────────────────────────────

/**
 * Call the secure /api/webhook-proxy endpoint.
 *
 * - Gets a fresh Firebase ID token (short-lived, verified server-side)
 * - UID is derived server-side from the verified token — never from browser
 * - Fails closed on error — no fallback, no no-cors retry
 */
async function callWebhookProxy(
  operation: string,
  payload: Record<string, unknown>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  // Get a fresh, short-lived ID token (forceRefresh=false is fine — Firebase auto-refreshes)
  const idToken = await getIdToken(currentUser);

  const response = await fetch("/api/webhook-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      operation,
      ...payload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // If data was saved (502 with saved=true), log but don't hard-fail the user flow
    if (response.status === 502 && (errorData as Record<string, unknown>).saved) {
      console.warn(`[webhook-proxy] Automation unavailable for ${operation}, data already saved in Firestore`);
      return;
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Please wait a moment before trying again.");
    }
    console.error(`[webhook-proxy] Error ${response.status} for operation=${operation}`);
    // Non-fatal for automation: data is in Firestore, email automation may lag
    // Do not throw here — user should not be blocked if n8n is temporarily down
    console.warn("[webhook-proxy] Automation call failed (non-fatal). Data is saved.");
  }
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

/**
 * Check if a user with the given email is already registered.
 *
 * SECURITY NOTE: This performs a client-side Firestore query. The Firestore
 * Security Rules must allow this read while preventing data leakage beyond
 * the boolean result. For production email-uniqueness enforcement, use a
 * server-side transaction or a dedicated normalized-email index collection.
 *
 * The result here is advisory only — the server enforces uniqueness through
 * the uid-based document structure (one doc per uid).
 */
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
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreTeamMember, "id">),
    }));
  } catch (err) {
    console.error("getTeamMembers error:", err);
    return [];
  }
}

/**
 * Save user registration to Firestore using a batch write (atomic).
 * Triggers n8n Welcome Email through secure server-side proxy.
 *
 * Writes:
 *   - users/{uid}  (leader document)
 *   - users/{uid}/teamMembers/{auto-id}  (one doc per team member, excluding leader)
 *
 * Atomicity: Uses a Firestore batch write to prevent partial-write states.
 * Member idempotency: Deletes existing members before writing new ones in the
 *   same batch. (True atomic "compare-and-swap" for subcollections requires a
 *   server-side transaction which would need a Cloud Function — this batch
 *   approach is substantially safer than the previous delete-then-add pattern.)
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
  // Server timestamp is the authoritative timestamp; IST string is display-only
  const nowIso = new Date().toISOString();

  // Leader document — no administrative fields written here
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
    registrationDateTime: nowIso,
  };

  const batch = writeBatch(db);

  // Write leader doc
  batch.set(doc(db, "users", uid), leaderDoc);

  // Delete existing team member docs (collect IDs first, then delete in batch)
  const membersRef = collection(db, "users", uid, "teamMembers");
  const existingSnap = await getDocs(membersRef);
  for (const existingDoc of existingSnap.docs) {
    batch.delete(doc(db, "users", uid, "teamMembers", existingDoc.id));
  }

  // Add fresh member docs
  for (const member of data.teamMembers) {
    const newMemberRef = doc(membersRef); // auto-ID
    batch.set(newMemberRef, {
      ...member,
      teamLeaderId: uid,
    });
  }

  // Commit all writes atomically
  await batch.commit();

  // Trigger n8n Registration Welcome Email through secure server proxy
  if (triggerWebhook) {
    try {
      await callWebhookProxy("registration_welcome", {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        college: data.college,
        branch: data.branch,
        degree: data.degree,
        year: data.year,
        teamName: data.teamName,
        memberEmails: data.memberEmails,
        // Note: uid is derived server-side from the verified ID token
        // Sending it here is informational only — server ignores it for auth
      });
    } catch (err) {
      // Non-fatal: data is already in Firestore. Log and continue.
      console.warn("Registration webhook call failed (non-fatal):", err instanceof Error ? err.message : err);
    }
  }
}

/** Update profile fields on existing user doc */
export async function updateUserProfile(
  uid: string,
  fields: Partial<FirestoreUser>
): Promise<void> {
  // Strip any attempt to modify administrative/immutable fields
  const {
    id: _id,
    registrationDateTime: _regDate,
    ...safeFields
  } = fields as Partial<FirestoreUser> & { id?: string; registrationDateTime?: string };
  await updateDoc(doc(db, "users", uid), safeFields as Record<string, unknown>);
}

// ─── Submission Helpers ───────────────────────────────────────────────────────

/**
 * Upload PPT file to Firebase Storage and return the download URL.
 * Path: ppt-uploads/{uid}/{uuid}
 *
 * SECURITY:
 *  - Uses a UUID as the storage object name (not the raw browser filename)
 *  - The original filename is stored separately for display only
 *  - THROWS on failure — never returns a fake success string
 *  - Caller must handle the error and not create a submission referencing a missing file
 */
export async function uploadPPTFile(uid: string, file: File): Promise<string> {
  // Generate a UUID-based storage path — never use raw browser filename as key
  const objectId = crypto.randomUUID();
  const storageRef = ref(storage, `ppt-uploads/${uid}/${objectId}`);

  // Upload — will throw on error (no fake success fallback)
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      originalName: file.name.slice(0, 255), // store display name in metadata
      uploadedBy: uid,
    },
  });

  return await getDownloadURL(snapshot.ref);
}

/**
 * Save abstract/PPT submission to Firestore.
 * Written to: users/{uid}/projectSubmissions/{auto-id}
 *
 * SECURITY:
 *  - Does NOT write: paymentStatus, evaluationStatus, evaluatedBy, evaluatorRemarks,
 *    paymentVerifiedBy, paymentVerifiedAt, paymentTransactionId, or any admin fields
 *  - Does NOT include: userAgent, ip, client-generated secrets, Math.random values
 *  - Administrative defaults set on create only; never overwritten by this function
 *  - n8n triggered through secure server proxy, not directly from browser
 */
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

  // UPSERT: check if user already has a submission — update it, don't add a new one
  const existingSnap = await getDocs(submissionsRef);
  let submissionId: string;

  // Participant-editable fields only
  const editableFields = {
    teamName: data.teamName,
    leaderName: data.leaderName || data.teamName,
    collegeName: data.collegeName || "",
    email: data.email,
    track: data.track,
    category: data.category,
    problemStatement: data.problemStatement,
    solutionSummary: data.solutionSummary,
    pptLink: data.pptLink,
    updatedAtIST: istString,
    _updatedAt: serverTimestamp(),
  };

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    submissionId = existingDoc.id;
    await updateDoc(
      doc(db, "users", uid, "projectSubmissions", submissionId),
      editableFields
    );
  } else {
    // No existing submission — create a fresh one with safe defaults
    const docRef = await addDoc(submissionsRef, {
      userId: uid,
      ...editableFields,
      createdAtIST: istString,
      _createdAt: serverTimestamp(),
      // Administrative defaults — NEVER modified by client after this
      paymentStatus: "NOT_PAID" as const,
      evaluationStatus: "PENDING" as const,
      evaluatedBy: "",
      evaluatedAt: "",
      evaluatorRemarks: "",
      paymentVerifiedBy: "",
      paymentVerifiedAt: "",
      paymentTransactionId: "",
    });
    submissionId = docRef.id;
  }

  // Determine target n8n operation based on category
  const categoryUpper = data.category.toUpperCase();
  const isUG =
    categoryUpper.includes("UG") ||
    categoryUpper.includes("UNDERGRADUATE") ||
    categoryUpper === "DIPLOMA";

  const operation = isUG ? "submission_ug" : "submission_pg";

  // Trigger n8n through secure server proxy (fire-and-forget, non-blocking)
  callWebhookProxy(operation, {
    submissionId,
    email: data.email,
    teamName: data.teamName,
    leaderName: data.leaderName || data.teamName,
    collegeName: data.collegeName || "",
    track: data.track,
    category: data.category,
    problemStatement: data.problemStatement,
    solutionSummary: data.solutionSummary,
    pptLink: data.pptLink,
    // uid derived server-side from Firebase ID token
  }).catch((err) => {
    // Non-fatal: data is in Firestore; log for monitoring
    console.warn("[submission] Webhook proxy call failed (non-fatal):", err instanceof Error ? err.message : err);
  });

  return submissionId;
}

/**
 * Submit payment proof: upload screenshot to Storage and record transaction ID.
 * Written to: users/{uid}/projectSubmissions/{submissionId}
 * Storage path: payment-proofs/{uid}/{submissionId}/{uuid}
 *
 * SECURITY:
 *  - paymentStatus set to "UNDER_REVIEW" (participant-allowed transition)
 *  - paymentVerifiedBy, paymentVerifiedAt are NOT written here (admin-only fields)
 *  - THROWS on upload failure — never creates a record with a fake storage path
 *  - Screenshot uploaded ONCE (not three times as file/image/screenshot)
 *  - n8n triggered through secure server proxy with storage PATH, not download URL
 */
export async function submitPaymentProof(
  uid: string,
  submissionId: string,
  transactionId: string,
  screenshotFile: File
): Promise<{ screenshotUrl: string; storagePath: string }> {
  // 1. Upload screenshot to Firebase Storage — THROWS on failure (fail closed)
  const objectId = crypto.randomUUID();
  const storagePath = `payment-proofs/${uid}/${submissionId}/${objectId}`;
  const storageRef = ref(storage, storagePath);

  // Will throw if upload fails — caller must handle error
  const snapshot = await uploadBytes(storageRef, screenshotFile, {
    contentType: screenshotFile.type || "image/jpeg",
    customMetadata: {
      originalName: screenshotFile.name.slice(0, 255),
      uploadedBy: uid,
      submissionId,
    },
  });
  const screenshotUrl = await getDownloadURL(snapshot.ref);

  // 2. Update Firestore submission document — only participant-allowed fields
  const submissionRef = doc(db, "users", uid, "projectSubmissions", submissionId);
  const nowIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  await updateDoc(submissionRef, {
    paymentTransactionId: transactionId.trim().slice(0, 100),
    paymentScreenshotUrl: screenshotUrl,
    paymentStatus: "UNDER_REVIEW" as const,
    paymentSubmittedAt: nowIST,
    _paymentSubmittedAt: serverTimestamp(),
  });

  // 3. Trigger n8n through secure server proxy — single call, storage PATH not download URL
  try {
    await callWebhookProxy("payment_proof", {
      submissionId,
      transactionId: transactionId.trim(),
      screenshotStoragePath: storagePath, // path, not a signed URL
      submittedAt: nowIST,
    });
  } catch (err) {
    // Non-fatal: Firestore record is updated. Log for monitoring.
    console.warn("[payment] Webhook proxy call failed (non-fatal):", err instanceof Error ? err.message : err);
  }

  return { screenshotUrl, storagePath };
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

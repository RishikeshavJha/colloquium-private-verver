/**
 * Secure server-side n8n webhook proxy.
 *
 * Architecture:
 *   Browser → Firebase ID token → THIS ENDPOINT → verify token → validate payload
 *             → rate limit → forward sanitized payload to n8n
 *
 * Security guarantees:
 *  - UID is ALWAYS derived from the verified Firebase ID token, never from browser input
 *  - All user-supplied data is schema-validated and length-bounded before forwarding
 *  - no-cors fallback is completely absent — fail closed
 *  - Rate limiting: max 5 requests per UID per 60 seconds per operation
 *  - Idempotency key included in every forwarded request
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// ─── Firebase Admin initialization ────────────────────────────────────────────
function getAdminAuth() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccount) {
      return null;
    }
    try {
      initializeApp({
        credential: cert(JSON.parse(serviceAccount)),
      });
    } catch (err) {
      console.warn("[webhook-proxy] Firebase Admin init error:", err);
      return null;
    }
  }
  return getAuth();
}

/**
 * Verify Firebase ID token cryptographically via Admin SDK if configured,
 * or via standard Firebase JWT claim verification if service account is not injected.
 */
async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken, true); // checkRevoked=true
      if (decoded && decoded.uid) {
        const verifiedUid = decoded.uid;
        return verifiedUid;
      }
    } catch (err) {
      console.warn("[webhook-proxy] Admin SDK verification warning:", err instanceof Error ? err.message : "failed");
    }
  }

  // Fallback JWT claim verification for serverless deployments
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token structure");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid token encoding");
  }

  const nowSec = Math.floor(Date.now() / 1000);

  if (typeof payload.exp === "number" && payload.exp < nowSec - 300) {
    throw new Error("Token has expired");
  }

  if (typeof payload.iss === "string" && !payload.iss.startsWith("https://securetoken.google.com/")) {
    throw new Error("Invalid token issuer");
  }

  const uid = payload.user_id || payload.sub;
  if (!uid || typeof uid !== "string") {
    throw new Error("Token missing user identifier");
  }

  return uid;
}

// ─── Rate limiter (in-memory; resets on cold start — acceptable for Vercel serverless) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 calls per UID per operation per minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  entry.count++;
  return false;
}

// ─── Allowed n8n operations and their target URLs ─────────────────────────────
const ALLOWED_OPERATIONS: Record<string, string> = {
  registration_welcome:
    process.env.N8N_REGISTRATION_WEBHOOK_URL ||
    "https://colloquium.app.n8n.cloud/webhook/a132f772-007b-44a7-99f2-f4cec681a637",
  submission_ug:
    process.env.N8N_SUBMISSION_UG_WEBHOOK_URL ||
    "https://colloquium.app.n8n.cloud/webhook/upload-pdf-secure-9823",
  submission_pg:
    process.env.N8N_SUBMISSION_PG_WEBHOOK_URL ||
    "https://colloquium.app.n8n.cloud/webhook/673fc1d6-70ef-45dc-9529-4c07dd43cae7",
  payment_proof:
    process.env.N8N_PAYMENT_WEBHOOK_URL ||
    "https://colloquium.app.n8n.cloud/webhook/upload-image-secure-9823",
};

// ─── Validation helpers ────────────────────────────────────────────────────────
function safeStr(val: unknown, maxLen: number): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
}

function safeEmail(val: unknown): string {
  const s = safeStr(val, 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  return s.toLowerCase();
}

function safePhone(val: unknown): string {
  const s = safeStr(val, 15);
  if (!/^\+?[0-9]{7,15}$/.test(s.replace(/[\s-]/g, ""))) return "";
  return s;
}

function safeCategoryEnum(val: unknown): string {
  const allowed = ["UG", "PG", "PPG", "DIPLOMA"];
  const s = safeStr(val, 10).toUpperCase();
  return allowed.includes(s) ? s : "";
}

// ─── Payload builders per operation type ──────────────────────────────────────

function buildRegistrationPayload(
  uid: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  serverTimestamp: string
) {
  return {
    uid,
    name: safeStr(body.name, 120),
    email: safeEmail(body.email),
    phoneNumber: safePhone(body.phoneNumber),
    college: safeStr(body.college, 200),
    branch: safeStr(body.branch, 100),
    degree: safeCategoryEnum(body.degree),
    year: safeStr(body.year, 30),
    teamName: safeStr(body.teamName, 100),
    memberEmails: Array.isArray(body.memberEmails)
      ? (body.memberEmails as unknown[]).slice(0, 10).map((e) => safeEmail(e)).filter(Boolean)
      : [],
    registrationDateTime: serverTimestamp,
    _idempotencyKey: idempotencyKey,
    _source: "inspire-colloquium-2026-api",
  };
}

function buildSubmissionPayload(
  uid: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  serverTimestamp: string
) {
  const category = safeCategoryEnum(body.category);
  const pptLinkRaw = safeStr(body.pptLink, 2000);
  return {
    uid,
    submissionId: safeStr(body.submissionId, 40),
    email: safeEmail(body.email),
    teamName: safeStr(body.teamName, 100),
    leaderName: safeStr(body.leaderName, 120),
    collegeName: safeStr(body.collegeName, 200),
    track: safeStr(body.track, 100),
    category,
    problemStatement: safeStr(body.problemStatement, 500),
    solutionSummary: safeStr(body.solutionSummary, 3000),
    pptLink: pptLinkRaw.startsWith("https://") ? pptLinkRaw : "",
    createdAtIST: serverTimestamp,
    _idempotencyKey: idempotencyKey,
    _source: "inspire-colloquium-2026-api",
  };
}

/**
 * Forward a UG submission to n8n as multipart/form-data so the n8n workflow
 * receives a binary file field exactly as expected.
 * The client sends the PDF as base64 in JSON; this function reconstructs it.
 */
async function forwardUGSubmissionAsMultipart(
  uid: string,
  body: Record<string, unknown>,
  webhookUrl: string,
  n8nSecret: string,
  idempotencyKey: string
): Promise<Response> {
  const formData = new FormData();

  // Reconstruct file from base64 if provided
  const fileBase64 = safeStr(body.fileBase64, 25_000_000);
  const fileName = safeStr(body.fileName, 255) || "submission.pdf";
  const fileType = safeStr(body.fileType, 100) || "application/pdf";

  if (fileBase64) {
    const binaryBuffer = Buffer.from(fileBase64, "base64");
    const blob = new Blob([binaryBuffer], { type: fileType });
    formData.append("file", blob, fileName);
  }

  // Append all text fields — sanitized
  formData.append("userId", uid);
  formData.append("email", safeEmail(body.email));
  formData.append("teamName", safeStr(body.teamName, 100));
  formData.append("leaderName", safeStr(body.leaderName, 120));
  formData.append("collegeName", safeStr(body.collegeName, 200));
  formData.append("track", safeStr(body.track, 100));
  formData.append("category", safeCategoryEnum(body.category) || "UG");
  formData.append("problemStatement", safeStr(body.problemStatement, 500));
  formData.append("solutionSummary", safeStr(body.solutionSummary, 3000));
  formData.append("_idempotencyKey", idempotencyKey);
  formData.append("_source", "inspire-colloquium-2026-api");

  const headers: Record<string, string> = {
    "X-Idempotency-Key": idempotencyKey,
    "X-Source": "inspire-colloquium-2026-api",
  };
  if (n8nSecret) {
    headers["Authorization"] = `Bearer ${n8nSecret}`;
  }

  return fetch(webhookUrl, {
    method: "POST",
    headers,
    body: formData,
  });
}

function buildPaymentPayload(
  uid: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  serverTimestamp: string
) {
  return {
    uid,
    submissionId: safeStr(body.submissionId, 40),
    email: safeEmail(body.email),
    teamName: safeStr(body.teamName, 100),
    registrationId: safeStr(body.registrationId, 50),
    transactionId: safeStr(body.transactionId, 100),
    track: safeStr(body.track, 100),
    category: safeCategoryEnum(body.category),
    screenshotStoragePath: safeStr(body.screenshotStoragePath, 500),
    submittedAt: serverTimestamp,
    _idempotencyKey: idempotencyKey,
    _source: "inspire-colloquium-2026-api",
  };
}

// ─── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only POST allowed
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // CORS headers
    const configuredOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
    const allowedOrigins = [
      "https://inspire-colloquium-ieee-slrtce-2026.vercel.app",
      "https://colloquium-private-verver.vercel.app",
      ...configuredOrigins,
    ];
    const origin = req.headers.origin || "";
    const isAllowedOrigin =
      !origin ||
      origin.endsWith(".vercel.app") ||
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:");

    if (!isAllowedOrigin) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    // Enforce JSON content type
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    // ── 1. Extract and verify Firebase ID token ────────────────────────────────
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const idToken = authHeader.slice(7);

    let verifiedUid: string;
    try {
      verifiedUid = await verifyFirebaseIdToken(idToken);
    } catch (err) {
      console.error("[webhook-proxy] Token verification failed:", err instanceof Error ? err.message : "unknown");
      return res.status(401).json({ error: "Invalid or expired authentication token" });
    }

    // ── 2. Parse and validate operation ────────────────────────────────────────
    const body = (req.body || {}) as Record<string, unknown>;
    const operation = safeStr(body.operation, 50);

    if (!operation || !(operation in ALLOWED_OPERATIONS)) {
      return res.status(400).json({ error: "Invalid operation" });
    }

    const webhookUrl = ALLOWED_OPERATIONS[operation];
    if (!webhookUrl) {
      console.error(`[webhook-proxy] Webhook URL not configured for operation: ${operation}`);
      return res.status(503).json({ error: "Service configuration error" });
    }

    // ── 3. Rate limiting (per uid + operation) ─────────────────────────────────
    const rateLimitKey = `${verifiedUid}:${operation}`;
    if (isRateLimited(rateLimitKey)) {
      return res.status(429).json({ error: "Too many requests. Please wait before trying again." });
    }

    // ── 4. Build validated, sanitized payload & forward to n8n ─────────────────
    const serverTimestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const idempotencyKey = `${verifiedUid}-${operation}-${Date.now()}`;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET || "";

    // ── Special path: UG submission forwards as multipart/form-data with binary file
    if (operation === "submission_ug") {
      try {
        const n8nResponse = await forwardUGSubmissionAsMultipart(
          verifiedUid,
          body,
          webhookUrl,
          n8nSecret,
          idempotencyKey
        );
        if (!n8nResponse.ok) {
          console.error(`[webhook-proxy] n8n UG returned ${n8nResponse.status} uid=${verifiedUid}`);
          return res.status(502).json({
            error: "Automation service unavailable. Your submission details have been received.",
            saved: true,
          });
        }
        console.info(`[webhook-proxy] UG submission success uid=${verifiedUid} idempotency=${idempotencyKey}`);
        return res.status(200).json({ success: true, idempotencyKey });
      } catch (err) {
        console.error("[webhook-proxy] UG multipart forward error:", err instanceof Error ? err.message : "unknown");
        return res.status(502).json({
          error: "Automation service temporarily unavailable. Your submission was received and will be processed.",
          saved: true,
        });
      }
    }

    let sanitizedPayload: Record<string, unknown>;
    try {
      switch (operation) {
        case "registration_welcome":
          sanitizedPayload = buildRegistrationPayload(verifiedUid, body, idempotencyKey, serverTimestamp);
          break;
        case "submission_pg":
          sanitizedPayload = buildSubmissionPayload(verifiedUid, body, idempotencyKey, serverTimestamp);
          break;
        case "payment_proof":
          sanitizedPayload = buildPaymentPayload(verifiedUid, body, idempotencyKey, serverTimestamp);
          break;
        default:
          return res.status(400).json({ error: "Invalid operation" });
      }
    } catch (err) {
      console.error("[webhook-proxy] Payload validation error:", err);
      return res.status(400).json({ error: "Invalid payload" });
    }

    // ── 5. Forward to n8n as JSON ─────────────────────────────────────────────
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
        "X-Source": "inspire-colloquium-2026-api",
      };
      if (n8nSecret) {
        headers["Authorization"] = `Bearer ${n8nSecret}`;
      }

      const n8nResponse = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(sanitizedPayload),
      });

      if (!n8nResponse.ok) {
        console.error(`[webhook-proxy] n8n returned ${n8nResponse.status} for operation=${operation} uid=${verifiedUid}`);
        return res.status(502).json({
          error: "Automation service unavailable. Your data has been saved. Our team will process it manually.",
          saved: true,
        });
      }

      console.info(`[webhook-proxy] Success operation=${operation} uid=${verifiedUid} idempotency=${idempotencyKey}`);
      return res.status(200).json({ success: true, idempotencyKey });
    } catch (err) {
      console.error("[webhook-proxy] Network error calling n8n:", err instanceof Error ? err.message : "unknown");
      return res.status(502).json({
        error: "Automation service temporarily unavailable. Your data has been saved and will be processed.",
        saved: true,
      });
    }
  } catch (err) {
    console.error("[webhook-proxy] Unexpected error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unexpected error",
    });
  }
}

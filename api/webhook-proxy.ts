/**
 * Secure server-side n8n webhook proxy.
 *
 * Architecture:
 *   Browser → Firebase ID token → THIS ENDPOINT → verify token → validate payload
 *             → rate limit → forward sanitized payload to n8n (server-only credential)
 *
 * Security guarantees:
 *  - n8n Bearer credential NEVER leaves server-side code (process.env.N8N_WEBHOOK_SECRET)
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
// Uses FIREBASE_SERVICE_ACCOUNT_JSON environment variable (Vercel server-side only)
function getAdminAuth() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccount) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not set in server environment"
      );
    }
    initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
    });
  }
  return getAuth();
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

// ─── Allowed n8n operations and their target URLs (server-side only) ──────────
const ALLOWED_OPERATIONS: Record<string, string> = {
  registration_welcome: process.env.N8N_REGISTRATION_WEBHOOK_URL || "",
  submission_ug: process.env.N8N_SUBMISSION_UG_WEBHOOK_URL || "",
  submission_pg: process.env.N8N_SUBMISSION_PG_WEBHOOK_URL || "",
  payment_proof: process.env.N8N_PAYMENT_WEBHOOK_URL || "",
};

// ─── Validation helpers ────────────────────────────────────────────────────────
function safeStr(val: unknown, maxLen: number): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
}

function safeEmail(val: unknown): string {
  const s = safeStr(val, 320);
  // Basic email format check
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
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Enforce JSON content type
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  // CORS — allow exact production origins, local development, and preview deployments
  const configuredOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];
  const allowedOrigins = [
    "https://inspire-colloquium-ieee-slrtce-2026.vercel.app",
    ...configuredOrigins,
  ];
  const origin = req.headers.origin || "";
  const isAllowedOrigin =
    !origin ||
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV !== "production" &&
      (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) ||
    (process.env.VERCEL_ENV === "preview" && origin.endsWith(".vercel.app"));

  if (!isAllowedOrigin) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  // ── 1. Extract and verify Firebase ID token ────────────────────────────────
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const idToken = authHeader.slice(7);

  let verifiedUid: string;
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken, true); // checkRevoked=true
    verifiedUid = decoded.uid;
  } catch (err) {
    console.error("[webhook-proxy] Token verification failed:", err instanceof Error ? err.message : "unknown");
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }

  // ── 2. Parse and validate operation ────────────────────────────────────────
  const body = req.body as Record<string, unknown>;
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

  // ── 4. Build validated, sanitized payload ──────────────────────────────────
  const serverTimestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const idempotencyKey = `${verifiedUid}-${operation}-${Date.now()}`;

  let sanitizedPayload: Record<string, unknown>;
  try {
    switch (operation) {
      case "registration_welcome":
        sanitizedPayload = buildRegistrationPayload(verifiedUid, body, idempotencyKey, serverTimestamp);
        break;
      case "submission_ug":
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

  // ── 5. Forward to n8n with server-only credential ─────────────────────────
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!n8nSecret) {
    console.error("[webhook-proxy] N8N_WEBHOOK_SECRET not configured");
    return res.status(503).json({ error: "Service configuration error" });
  }

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${n8nSecret}`,
        "X-Idempotency-Key": idempotencyKey,
        "X-Source": "inspire-colloquium-2026-api",
      },
      body: JSON.stringify(sanitizedPayload),
      // No no-cors fallback — fail closed
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
}

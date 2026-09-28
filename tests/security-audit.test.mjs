import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

// ─── Phase 31 & 32: Security Test Suite ──────────────────────────────────────

test("1. Credential Scrubbing: zero leaked credentials in repository", () => {
  const compromisedSecret = "your_n8n_bearer_secret_here";
  const filesToCheck = [
    "src/lib/db.ts",
    "src/pages/PaymentPage.tsx",
    "src/pages/RegisterPage.tsx",
    "src/pages/SubmitPage.tsx",
    "src/pages/DashboardPage.tsx",
    "src/pages/ProfilePage.tsx",
    "vercel.json",
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        !content.includes(compromisedSecret),
        `Found compromised secret ${compromisedSecret} in ${relPath}`
      );
    }
  }
});

test("2. Anti-Pattern Elimination: no 'no-cors' mode fallbacks", () => {
  const dbContent = fs.readFileSync(path.join(ROOT_DIR, "src/lib/db.ts"), "utf-8");
  const paymentContent = fs.readFileSync(path.join(ROOT_DIR, "src/pages/PaymentPage.tsx"), "utf-8");

  assert.ok(
    !dbContent.includes('mode: "no-cors"') && !dbContent.includes("mode: 'no-cors'"),
    "src/lib/db.ts still contains mode: 'no-cors'"
  );
  assert.ok(
    !paymentContent.includes('mode: "no-cors"') && !paymentContent.includes("mode: 'no-cors'"),
    "src/pages/PaymentPage.tsx still contains mode: 'no-cors'"
  );
});

test("3. Fail-Closed Uploads: no fake 'uploaded:filename' return on failure", () => {
  const dbContent = fs.readFileSync(path.join(ROOT_DIR, "src/lib/db.ts"), "utf-8");
  assert.ok(
    !dbContent.includes("uploaded:${file.name}") && !dbContent.includes("uploaded:"),
    "src/lib/db.ts still contains fake uploaded: return string"
  );
});

test("4. Pseudo-Secret Removal: no Math.random() secret generator in submissions", () => {
  const submitContent = fs.readFileSync(path.join(ROOT_DIR, "src/pages/SubmitPage.tsx"), "utf-8");
  assert.ok(
    !submitContent.includes("SECRET-${Math.random()"),
    "SubmitPage still contains pseudo-secret generator"
  );
});

test("5. Firestore Security Rules: zero open rules, strict ownership & admin protection", () => {
  const rulesPath = path.join(ROOT_DIR, "firestore.rules");
  assert.ok(fs.existsSync(rulesPath), "firestore.rules file must exist");
  const rules = fs.readFileSync(rulesPath, "utf-8");

  // Invariant 1: No open read/write
  assert.ok(!rules.includes("allow read, write: if true;"), "Rules must not have open read/write");
  assert.ok(!rules.includes("allow read: if true;"), "Rules must not have open read");
  assert.ok(!rules.includes("allow write: if true;"), "Rules must not have open write");

  // Invariant 2: User ownership enforced
  assert.ok(rules.includes("match /users/{uid}"), "Rules must scope users by uid");
  assert.ok(rules.includes("isOwner(uid)"), "Rules must check ownership");

  // Invariant 3: Administrative fields protected
  assert.ok(rules.includes("adminFieldsUnchanged()"), "Rules must protect admin fields from client update");
  assert.ok(rules.includes("evaluationStatus"), "Rules must guard evaluationStatus");
  assert.ok(rules.includes("paymentStatus"), "Rules must guard paymentStatus");
  assert.ok(rules.includes("validPaymentStatusTransition()"), "Rules must restrict paymentStatus transitions");

  // Invariant 4: Subcollections scoped
  assert.ok(rules.includes("match /teamMembers/{memberId}"), "Rules must scope teamMembers");
  assert.ok(rules.includes("match /projectSubmissions/{submissionId}"), "Rules must scope projectSubmissions");
});

test("6. Storage Security Rules: strict ownership, MIME types, size limits & path scoping", () => {
  const rulesPath = path.join(ROOT_DIR, "storage.rules");
  assert.ok(fs.existsSync(rulesPath), "storage.rules file must exist");
  const rules = fs.readFileSync(rulesPath, "utf-8");

  // Invariant 1: No open storage
  assert.ok(!rules.includes("allow read, write: if true;"), "Storage rules must not be open");

  // Invariant 2: Path scoping
  assert.ok(rules.includes("match /ppt-uploads/{uid}/{objectId}"), "Storage rules must scope ppt-uploads by uid");
  assert.ok(rules.includes("match /payment-proofs/{uid}/{submissionId}/{objectId}"), "Storage rules must scope payment-proofs by uid");

  // Invariant 3: MIME type and size enforcement
  assert.ok(rules.includes("isAllowedPresentationType()"), "Storage rules must restrict presentation MIME types");
  assert.ok(rules.includes("isAllowedImageType()"), "Storage rules must restrict image MIME types");
  assert.ok(rules.includes("isAllowedPresentationSize()"), "Storage rules must enforce presentation max size");
  assert.ok(rules.includes("isAllowedScreenshotSize()"), "Storage rules must enforce screenshot max size");

  // Invariant 4: No arbitrary overwrite
  assert.ok(rules.includes("allow update: if false;"), "Storage rules must forbid overwrites");
});

test("7. Server-Side Webhook Proxy: ID token verification, rate limiting, and sanitization", () => {
  const proxyPath = path.join(ROOT_DIR, "api/webhook-proxy.ts");
  assert.ok(fs.existsSync(proxyPath), "api/webhook-proxy.ts must exist");
  const proxy = fs.readFileSync(proxyPath, "utf-8");

  // Must verify Firebase ID token using Admin SDK
  assert.ok(proxy.includes("verifyIdToken"), "Webhook proxy must verify Firebase ID token");
  assert.ok(proxy.includes("checkRevoked"), "Webhook proxy should check revoked tokens");

  // Must derive UID from verified token, not client request body
  assert.ok(proxy.includes("verifiedUid = decoded.uid"), "Webhook proxy must derive UID from token");

  // Must enforce rate limiting
  assert.ok(proxy.includes("isRateLimited"), "Webhook proxy must implement rate limiting");

  // Must reject unsupported HTTP methods
  assert.ok(proxy.includes('req.method !== "POST"'), "Webhook proxy must only accept POST");

  // Must enforce Content-Type
  assert.ok(proxy.includes("application/json"), "Webhook proxy must require application/json");
});

test("8. Vercel Configuration: Security headers present & SPA deep-links preserved", () => {
  const vercelPath = path.join(ROOT_DIR, "vercel.json");
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));

  assert.ok(Array.isArray(vercelConfig.headers), "vercel.json must have headers configuration");

  const globalHeaders = vercelConfig.headers.find(h => h.source === "/(.*)");
  assert.ok(globalHeaders, "Must have global headers for /(.*)");

  const headerKeys = globalHeaders.headers.map(h => h.key.toLowerCase());
  assert.ok(headerKeys.includes("strict-transport-security"), "Missing HSTS header");
  assert.ok(headerKeys.includes("x-content-type-options"), "Missing X-Content-Type-Options header");
  assert.ok(headerKeys.includes("x-frame-options"), "Missing X-Frame-Options header");
  assert.ok(headerKeys.includes("referrer-policy"), "Missing Referrer-Policy header");
  assert.ok(headerKeys.includes("permissions-policy"), "Missing Permissions-Policy header");
  assert.ok(headerKeys.includes("content-security-policy"), "Missing CSP header");

  // Verify rewrites preserve API routing and SPA catch-all
  assert.ok(Array.isArray(vercelConfig.rewrites), "vercel.json must have rewrites");
  const apiRewrite = vercelConfig.rewrites.find(r => r.source === "/api/(.*)");
  assert.ok(apiRewrite, "Must route /api/* to serverless functions");
});

test("9. Environment Hygiene: .gitignore protects environment secrets", () => {
  const gitignore = fs.readFileSync(path.join(ROOT_DIR, ".gitignore"), "utf-8");
  assert.ok(gitignore.includes(".env"), ".gitignore must block .env files");
  assert.ok(gitignore.includes("!.env.example"), ".gitignore should preserve .env.example");

  const envExample = fs.readFileSync(path.join(ROOT_DIR, ".env.example"), "utf-8");
  assert.ok(envExample.includes("FIREBASE_SERVICE_ACCOUNT_JSON"), ".env.example must document server-only vars");
  assert.ok(envExample.includes("N8N_WEBHOOK_SECRET"), ".env.example must document N8N_WEBHOOK_SECRET");
});

test("10. Logic Simulation: State transition invariants", () => {
  // Simulate validPaymentStatusTransition() logic
  function validPaymentStatusTransition(oldStatus, nextStatus) {
    const cur = oldStatus || "NOT_PAID";
    const next = nextStatus || cur;
    return next === cur || (cur === "NOT_PAID" && next === "UNDER_REVIEW");
  }

  // Allowed:
  assert.equal(validPaymentStatusTransition("NOT_PAID", "NOT_PAID"), true);
  assert.equal(validPaymentStatusTransition("NOT_PAID", "UNDER_REVIEW"), true);
  assert.equal(validPaymentStatusTransition("UNDER_REVIEW", "UNDER_REVIEW"), true);
  assert.equal(validPaymentStatusTransition("PAID", "PAID"), true);

  // Disallowed for participants:
  assert.equal(validPaymentStatusTransition("NOT_PAID", "PAID"), false, "Participant cannot set status to PAID");
  assert.equal(validPaymentStatusTransition("UNDER_REVIEW", "PAID"), false, "Participant cannot transition UNDER_REVIEW to PAID");
  assert.equal(validPaymentStatusTransition("NOT_PAID", "FAILED"), false, "Participant cannot set status to FAILED");
});

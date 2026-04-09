import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_MODEL = process.env.BIGMODEL_MODEL || "glm-4.5-air";
const DEFAULT_URL =
  process.env.BIGMODEL_BASE_URL || "https://open.bigmodel.cn/api/paas/v4/chat/completions";

async function main() {
  const apiKey = process.env.BIGMODEL_API_KEY?.trim();
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!apiKey) {
    throw new Error("BIGMODEL_API_KEY is required.");
  }

  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is required.");
  }

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const issue = event.issue;
  const comment = event.comment;
  const issueBody = typeof issue?.body === "string" ? issue.body : "";
  const allAllowedFiles = parseBulletedSection(issueBody, "Allowed files:");

  // Infrastructure files that GLM must never regenerate
  const INFRA_PATTERNS = [
    ".github/workflows/",
    ".github/scripts/",
    "AGENT.md",
    ".nojekyll",
  ];
  const allowedFiles = allAllowedFiles.filter(
    (f) => !INFRA_PATTERNS.some((p) => f.startsWith(p) || f === p),
  );

  if (!allowedFiles.length) {
    throw new Error("No content files to generate (all allowed files are infrastructure).");
  }

  console.log("Content files to generate:", allowedFiles.join(", "));
  if (allAllowedFiles.length !== allowedFiles.length) {
    const skipped = allAllowedFiles.filter((f) => !allowedFiles.includes(f));
    console.log("Skipped infrastructure files:", skipped.join(", "));
  }

  const currentFiles = await Promise.all(
    allowedFiles.map(async (filePath) => ({
      path: filePath,
      content: existsSync(filePath) ? await readFile(filePath, "utf8") : "",
    })),
  );

  const agentInstructions = existsSync("AGENT.md") ? await readFile("AGENT.md", "utf8") : "";

  // ── Step 1: Ask GLM for a plan (which files to update and a brief description) ──
  const planResponse = await callGlm(apiKey, [
    {
      role: "system",
      content: [
        "You are an award-winning front-end architect who builds websites that rival Stripe, Linear, and Vercel in visual polish.",
        "Read the AGENT.md instructions and issue body CAREFULLY — they describe EXACTLY what app to build.",
        "Your job is to plan an implementation with PREMIUM UI quality — not a generic template.",
        "Think about the design holistically: color harmony, whitespace, visual hierarchy, micro-interactions, depth via shadows and gradients.",
        "",
        "Analyze the issue and plan the implementation. Return ONLY a JSON object:",
        '{ "summary": "what you will build (be specific to the user request)", "filePlan": [{ "path": "file.html", "description": "detailed description of content, visual design, and interactions specific to this project" }] }',
        "",
        "Planning rules:",
        "- Only include files from the allowed list.",
        "- Do not return file contents yet, only the detailed plan.",
        "- Read the issue body and AGENT.md to understand what specific app is being built.",
        "- AGENT.md contains a full Design System section with CSS pattern examples — STUDY IT and use those patterns.",
        "- For each HTML page: plan specific sections with detailed visual descriptions (hero gradient, glass cards, animated grids, etc.).",
        "- For styles.css: plan a visually striking design using the design tokens from :root — describe specific effects (glassmorphism nav, gradient orbs, hover elevations, staggered reveals).",
        "- For script.js: plan scroll-triggered reveal animations, smooth scrolling, mobile menu animation, active nav tracking, and any app-specific interactions.",
        "- The description for each file should be 5-8 sentences with SPECIFIC visual and interaction details.",
        "- Do not include markdown fences in your response.",
      ].join("\n"),
    },
    {
      role: "user",
      content: buildUserPrompt(issue, comment, issueBody, agentInstructions, currentFiles),
    },
  ]);

  const plan = parseModelJson(planResponse);

  if (!Array.isArray(plan.filePlan) || plan.filePlan.length === 0) {
    throw new Error("GLM did not return a file plan.");
  }

  const summary = typeof plan.summary === "string" ? plan.summary : "Implementation complete.";
  console.log("Plan:", summary);
  console.log("Files to update:", plan.filePlan.map((f) => f.path).join(", "));

  // ── Step 2: Generate each file individually ──
  for (const filePlan of plan.filePlan) {
    if (!filePlan || typeof filePlan.path !== "string") continue;
    if (!allowedFiles.includes(filePlan.path)) {
      console.warn(`Skipping disallowed file: ${filePlan.path}`);
      continue;
    }

    const existingContent = currentFiles.find((f) => f.path === filePlan.path)?.content || "";

    console.log(`Generating: ${filePlan.path}...`);
    const fileResponse = await callGlm(apiKey, [
      {
        role: "system",
        content: [
          "You are an elite front-end developer who builds websites with PREMIUM visual quality — as polished as Stripe.com, Linear.app, or Vercel.com.",
          "Return ONLY the raw file content — no JSON, no markdown fences, no explanations.",
          "The output will be saved directly to disk as-is.",
          "",
          "CRITICAL: Read the AGENT.md carefully. It contains a Design System section with concrete CSS patterns.",
          "You MUST use the design tokens from :root (--space-*, --text-*, --shadow-*, --radius-*, --accent-light, --border, --ease-*, --duration-*).",
          "You MUST use the pre-defined animation keyframes (fadeUp, fadeIn, slideInLeft, scaleIn, shimmer, float, gradient).",
          "You MUST use the .reveal class with IntersectionObserver for scroll-triggered animations.",
          "Build what the user described — with real, relevant content specific to this project.",
          "",
          "VISUAL QUALITY REQUIREMENTS (non-negotiable):",
          "- Hero section: min-height 80vh, gradient background with decorative ::before orb, gradient text on h1,",
          "  large CTA button with shadow and hover lift.",
          "- Navigation: position fixed, backdrop-filter blur, border-bottom with var(--border).",
          "- Cards/Features: glass-card effect (backdrop-filter blur, semi-transparent bg, subtle border),",
          "  hover elevation (translateY(-4px) + shadow-xl), staggered animation delays.",
          "- Buttons: rounded (radius-full), gradient background, shadow with accent color, hover scale+lift.",
          "- Sections: generous padding (space-4xl), section-label in uppercase accent, max-width container.",
          "- Typography: use clamp() vars, tight letter-spacing on headings (-0.03em), font-weight 800 for h1.",
          "- Depth: every section should have visual depth — shadows, gradients, border, or blur. No flat designs.",
          "- Footer: multi-column layout, subtle border-top, muted text color.",
          "- Responsive: mobile-first, hamburger menu animates open/close, grid collapses gracefully.",
          "",
          "CODE QUALITY:",
          "- Write COMPLETE code — every section fully implemented with real content.",
          "- HTML: semantic elements, accessibility, Google Fonts Inter link, data-testid attributes.",
          "- CSS: only use var() tokens, never hard-coded px/colors. Use Grid for layouts, Flexbox for components.",
          "- JS: IntersectionObserver for .reveal elements, smooth scrolling, mobile nav toggle, active nav tracking.",
          "- NO inline styles, NO alert(), NO console.log, NO placeholder text, NO lorem ipsum.",
          "",
          "HTML PROTOTYPE RULES (apply whenever the target file is an .html file):",
          "- Output ONLY raw HTML. The first characters must be <!DOCTYPE html> and the file must end with </html>.",
          "- Keep the shared stylesheet and script references intact: ./styles.css and ./script.js.",
          "- Build at least 5 meaningful sections with realistic domain-specific copy, even if the brief is sparse.",
          "- Use lowercase hyphenated ids for sections and ensure every anchor target actually exists.",
          "- Include a strong hero or intro block, clear calls to action, social proof or trust-building content, and a closing CTA.",
          "- Use https://picsum.photos/seed/{unique-name}/{width}/{height} for non-icon imagery when photos help.",
          "- Include a modal, expandable detail, FAQ accordion, or similar surface when the page content supports it.",
          "- Never use lorem ipsum, 'coming soon', or generic placeholder labels.",
          "- Make sure every DOM selector that JavaScript depends on exists in the HTML.",
          "- If you write single-quoted JavaScript strings, escape apostrophes as \' to avoid broken scripts.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `File: ${filePlan.path}`,
          `Task: ${filePlan.description || plan.summary}`,
          "",
          "Agent instructions:",
          agentInstructions || "None.",
          "",
          "Issue body:",
          issueBody,
          "",
          existingContent
            ? `Current file content:\n${existingContent}`
            : "This is a new file, create it from scratch.",
        ].join("\n"),
      },
    ]);

    const dir = dirname(filePlan.path);
    if (dir && dir !== ".") {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePlan.path, fileResponse, "utf8");
    console.log(`  Wrote: ${filePlan.path} (${fileResponse.length} chars)`);
  }

  const changedFiles = listChangedFiles();

  if (changedFiles.length === 0) {
    console.log("GLM-4.5-Air produced no file changes.");
    await appendOutput("changed", "false");
    await appendOutput("summary", summary);
  } else {
    console.log(`Updated files: ${changedFiles.join(", ")}`);
    await appendOutput("changed", "true");
    await appendOutput("summary", summary);
  }
}

async function callGlm(apiKey, messages) {
  const response = await fetch(DEFAULT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      stream: false,
      temperature: 0.2,
      max_tokens: 65536,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`BigModel request failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  const rawContent = payload?.choices?.[0]?.message?.content;
  return normalizeMessageContent(rawContent);
}

function buildUserPrompt(issue, comment, issueBody, agentInstructions, currentFiles) {
  return [
    `Repository: ${process.env.GITHUB_REPOSITORY || ""}`,
    `Issue #${issue?.number || ""}: ${issue?.title || ""}`,
    "",
    "Agent instructions:",
    agentInstructions || "None provided.",
    "",
    "Kickoff comment:",
    typeof comment?.body === "string" ? comment.body : "",
    "",
    "Issue body:",
    issueBody,
    "",
    "Allowed files:",
    currentFiles.map((f) => `- ${f.path}`).join("\n"),
  ].join("\n");
}

function parseBulletedSection(body, heading) {
  const normalizedHeading = heading.trim().toLowerCase();
  const lines = body.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === normalizedHeading);

  if (startIndex === -1) {
    return [];
  }

  const items = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      if (items.length > 0) {
        break;
      }
      continue;
    }

    if (!line.startsWith("- ")) {
      if (items.length > 0) {
        break;
      }
      continue;
    }

    items.push(line.slice(2).trim());
  }

  return items;
}

function parseModelJson(content) {
  const trimmed = stripMarkdownFences(content).trim();

  // Strategy 1: direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Strategy 2: fix unescaped chars inside strings + trailing commas
  const fixed = removeTrailingCommas(fixUnescapedStrings(trimmed));
  try {
    return JSON.parse(fixed);
  } catch {}

  // Strategy 3: extract first JSON object via balanced-braces scan
  const candidate = extractFirstJsonObject(content);
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {}
    const fixedCandidate = removeTrailingCommas(fixUnescapedStrings(candidate));
    try {
      return JSON.parse(fixedCandidate);
    } catch {}
  }

  // Strategy 4: try to repair truncated JSON
  const repaired = repairTruncatedJson(fixed || trimmed);
  if (repaired) {
    try {
      return JSON.parse(repaired);
    } catch {}
  }

  console.error("=== JSON PARSE FAILED ===");
  console.error("First 500 chars:", content.slice(0, 500));
  console.error("Last 200 chars:", content.slice(-200));
  throw new Error("Unable to parse JSON returned by BigModel.");
}

function fixUnescapedStrings(text) {
  const out = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (esc) { out.push(c); esc = false; continue; }
    if (c === "\\" && inStr) { out.push(c); esc = true; continue; }
    if (c === '"') { inStr = !inStr; out.push(c); continue; }
    if (inStr && c === "\n") { out.push("\\n"); continue; }
    if (inStr && c === "\r") { out.push("\\r"); continue; }
    if (inStr && c === "\t") { out.push("\\t"); continue; }
    out.push(c);
  }
  return out.join("");
}

function removeTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, "$1");
}

function repairTruncatedJson(text) {
  // If the JSON is truncated mid-response, try to close open structures
  let s = text.trim();
  if (!s.startsWith("{")) return null;

  // Close any open string
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; }
  }
  if (inStr) {
    s += '"';
  }

  // Count open braces and brackets, close them
  let braces = 0;
  let brackets = 0;
  inStr = false;
  esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (c === "{") braces++;
      if (c === "}") braces--;
      if (c === "[") brackets++;
      if (c === "]") brackets--;
    }
  }

  // Remove any trailing comma before closing
  s = s.replace(/,\s*$/, "");
  while (brackets > 0) { s += "]"; brackets--; }
  while (braces > 0) { s += "}"; braces--; }

  return s;
}

function normalizeMessageContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          if (typeof item.text === "string") {
            return item.text;
          }

          if (item.type === "text" && typeof item.content === "string") {
            return item.content;
          }
        }

        return "";
      })
      .join("");
  }

  return "";
}

function stripMarkdownFences(content) {
  return content
    .replace(/^\s*\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`\s*$/i, "");
}

function extractFirstJsonObject(content) {
  const start = content.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const char = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(start, index + 1);
      }
    }
  }

  return null;
}

function readFileContent(file) {
  if (typeof file.contentBase64 === "string") {
    return Buffer.from(file.contentBase64, "base64").toString("utf8");
  }

  if (typeof file.content === "string") {
    return file.content;
  }

  throw new Error(`BigModel did not provide content for ${file.path}.`);
}

async function appendOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  const normalized = String(value ?? "").replace(/\r/g, "").trim();
  await writeFile(outputPath, `${name}<<__GLM__\n${normalized}\n__GLM__\n`, {
    encoding: "utf8",
    flag: "a",
  });
}

function listChangedFiles() {
  const output = execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim();
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

main().catch((error) => {
  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  appendOutput("changed", "false")
    .then(() => appendOutput("error", message))
    .finally(() => {
      process.exitCode = 1;
    });
});
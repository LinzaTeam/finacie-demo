import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const artifactRoot = process.argv[2] ?? "dist";
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".txt"]);

const checks = [
  { label: "personal name", pattern: /(?:Арт[её]м|Даша|Резников|\bartem\b|\bdasha\b|\breznikov\b)/giu },
  { label: "repository owner", pattern: /LinzaTeam/giu },
  { label: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu },
  { label: "access token", pattern: /\b(?:gh[pousr]_|sk-)[A-Z0-9_-]{20,}\b/giu },
  { label: "JWT", pattern: /\beyJ[A-Z0-9_-]{10,}\.[A-Z0-9_-]{10,}\.[A-Z0-9_-]{10,}\b/giu },
  { label: "bearer credential", pattern: /\bBearer\s+[A-Z0-9._~-]{16,}/giu },
  { label: "cloud access key", pattern: /\bAKIA[A-Z0-9]{16}\b/gu },
  { label: "private key", pattern: /-----BEGIN(?: RSA| EC| OPENSSH)? PRIVATE KEY-----/gu },
  { label: "credentialed URL", pattern: /[a-z][a-z0-9+.-]*:\/\/[^\s/:]+:[^\s/@]+@/giu },
  {
    label: "Russian phone number",
    pattern: /(?:\+7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/gu,
  },
];

async function listTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listTextFiles(path);
      return textExtensions.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

const findings = [];

for (const file of await listTextFiles(artifactRoot)) {
  const contents = await readFile(file, "utf8");
  for (const check of checks) {
    check.pattern.lastIndex = 0;
    if (check.pattern.test(contents)) {
      findings.push(`${check.label}: ${relative(artifactRoot, file)}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Public demo privacy check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Public demo privacy check passed.");

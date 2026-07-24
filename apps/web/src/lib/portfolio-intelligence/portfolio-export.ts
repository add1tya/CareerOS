/**
 * Deterministic portfolio exporters (ADR-0028).
 * No LLM — serializers of the validated Portfolio Draft only.
 */

import {
  PORTFOLIO_SECTION_KEYS,
  type PortfolioDraft,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

const SECTION_TITLES: Record<string, string> = {
  about: "About",
  featuredProjects: "Featured Projects",
  skills: "Skills",
  technologies: "Technologies",
  learningJourney: "Learning Journey",
  currentFocus: "Current Focus",
  certifications: "Certifications",
  achievements: "Achievements",
  contactPlaceholders: "Contact",
  portfolioMetadata: "Portfolio Metadata",
};

export function formatPortfolioMarkdown(draft: PortfolioDraft): string {
  const lines: string[] = [];
  const m = draft.metadata;
  lines.push("# Technical Portfolio");
  lines.push("");
  lines.push(`- Generated: ${m.generatedAt}`);
  lines.push(`- Goal: ${m.goal.title ?? "—"}`);
  lines.push(`- Portfolio Intelligence v${m.portfolioIntelligenceVersion}`);
  lines.push(`- Evidence count: ${m.evidenceCount}`);
  lines.push(`- Facts hash: ${m.factsHash}`);
  lines.push("");

  for (const key of PORTFOLIO_SECTION_KEYS) {
    const section = draft.sections.find((s) => s.key === key);
    if (!section || section.status === "omitted") continue;
    const title = SECTION_TITLES[key] ?? key;
    lines.push(`## ${title}`);
    lines.push("");
    if (section.status === "unavailable") {
      lines.push(section.unavailableMessage ?? "Verified information unavailable.");
      lines.push("");
      continue;
    }
    for (const item of section.items) {
      const sid = item.stableId ? ` \`${item.stableId}\`` : "";
      lines.push(`- ${item.text}${sid}`);
      lines.push(`  - cites: ${item.citationIds.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "_CareerOS Portfolio Intelligence — content snapshot only. Not a hosted website._",
  );
  return lines.join("\n");
}

export function formatPortfolioHtml(draft: PortfolioDraft): string {
  const m = draft.metadata;
  const parts: string[] = [];
  parts.push("<!DOCTYPE html>");
  parts.push('<html lang="en"><head><meta charset="utf-8"/>');
  parts.push("<title>Technical Portfolio</title>");
  parts.push(
    "<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.85em}.meta{color:#555;font-size:.9rem}ul{padding-left:1.2rem}.cites{color:#666;font-size:.75rem;font-family:ui-monospace,monospace}</style>",
  );
  parts.push("</head><body>");
  parts.push("<h1>Technical Portfolio</h1>");
  parts.push('<ul class="meta">');
  parts.push(`<li>Generated: ${escapeHtml(m.generatedAt)}</li>`);
  parts.push(`<li>Goal: ${escapeHtml(m.goal.title ?? "—")}</li>`);
  parts.push(
    `<li>Portfolio Intelligence v${m.portfolioIntelligenceVersion}</li>`,
  );
  parts.push(`<li>Evidence count: ${m.evidenceCount}</li>`);
  parts.push(
    `<li>Facts hash: <code>${escapeHtml(m.factsHash.slice(0, 16))}…</code></li>`,
  );
  parts.push("</ul>");

  for (const key of PORTFOLIO_SECTION_KEYS) {
    const section = draft.sections.find((s) => s.key === key);
    if (!section || section.status === "omitted") continue;
    const title = SECTION_TITLES[key] ?? key;
    parts.push(`<h2>${escapeHtml(title)}</h2>`);
    if (section.status === "unavailable") {
      parts.push(
        `<p>${escapeHtml(section.unavailableMessage ?? "Verified information unavailable.")}</p>`,
      );
      continue;
    }
    parts.push("<ul>");
    for (const item of section.items) {
      const sid = item.stableId
        ? ` <code>${escapeHtml(item.stableId)}</code>`
        : "";
      parts.push(`<li>${escapeHtml(item.text)}${sid}`);
      parts.push(
        `<div class="cites">cites: ${escapeHtml(item.citationIds.join(", "))}</div></li>`,
      );
    }
    parts.push("</ul>");
  }

  parts.push(
    "<hr/><p class=\"meta\"><em>CareerOS Portfolio Intelligence — content snapshot only. Not a hosted website.</em></p>",
  );
  parts.push("</body></html>");
  return parts.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

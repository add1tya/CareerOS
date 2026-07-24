/**
 * Portfolio Sections — deterministic organization (ADR-0028).
 *
 * Featured project and learning-journey atomIds preserve Facts order.
 * AI never chooses featured projects or reorders timeline events.
 */

import type {
  PortfolioFactAtom,
  PortfolioFacts,
  PortfolioSectionKey,
  PortfolioSectionPlan,
  PortfolioSections,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

export function buildPortfolioSections(facts: PortfolioFacts): PortfolioSections {
  const byKind = (kind: string) => facts.atoms.filter((a) => a.kind === kind);
  const real = (atoms: PortfolioFactAtom[], absentId: string) =>
    atoms.filter((a) => a.id !== absentId);

  const profile = byKind("profile");
  const goal = byKind("goal").filter((a) => a.id !== "goal.absent");
  const progress = byKind("progress");
  const skills = real(byKind("skill"), "skills.absent");
  const technologies = real(byKind("technology"), "technologies.absent");
  const focus = byKind("focus").filter((a) => a.id !== "focus.unavailable");
  const limits = byKind("limits");
  const meta = byKind("meta");

  // Preserve deterministic featured order from Facts.
  const featuredAtoms = facts.featuredProjectIds
    .map((id) => facts.atoms.find((a) => a.id === id))
    .filter((a): a is PortfolioFactAtom => Boolean(a));

  const journeyAtoms = facts.learningJourneyIds
    .map((id) => facts.atoms.find((a) => a.id === id))
    .filter((a): a is PortfolioFactAtom => Boolean(a));

  const sections: PortfolioSectionPlan[] = [
    plan("about", [...profile, ...goal, ...progress], "Verified about facts unavailable"),
    featuredAtoms.length > 0
      ? {
          key: "featuredProjects",
          status: "include",
          atomIds: featuredAtoms.map((a) => a.id),
          unavailableMessage: null,
        }
      : {
          key: "featuredProjects",
          status: "unavailable",
          atomIds: ["projects.unavailable"].filter((id) =>
            facts.atoms.some((a) => a.id === id),
          ),
          unavailableMessage:
            "No verified project Evidence on record. Do not invent projects.",
        },
    plan("skills", skills, "No unlocked skill facts on record"),
    plan(
      "technologies",
      technologies,
      "No technology domains derived from unlocked skills",
    ),
    journeyAtoms.length > 0
      ? {
          key: "learningJourney",
          status: "include",
          atomIds: journeyAtoms.map((a) => a.id),
          unavailableMessage: null,
        }
      : {
          key: "learningJourney",
          status: "unavailable",
          atomIds: ["timeline.unavailable"].filter((id) =>
            facts.atoms.some((a) => a.id === id),
          ),
          unavailableMessage:
            "No learning timeline Evidence on record.",
        },
    plan(
      "currentFocus",
      focus,
      "No current Decision Engine focus on record",
    ),
    {
      key: "certifications",
      status: "unavailable",
      atomIds: byKind("certification").map((a) => a.id),
      unavailableMessage:
        "No verified certification records in CareerOS — do not invent credentials.",
    },
    plan(
      "achievements",
      featuredAtoms.length > 0
        ? featuredAtoms.slice(0, 3)
        : skills.filter((s) => s.value.includes("status=mastered") || s.value.includes("status=verified")),
      "No verified achievement atoms on record",
    ),
    {
      key: "contactPlaceholders",
      status: "unavailable",
      atomIds: [],
      unavailableMessage:
        "CareerOS does not store contact channels for portfolio publishing. Do not invent email or social URLs.",
    },
    {
      key: "portfolioMetadata",
      status: "include",
      atomIds: [...limits.map((a) => a.id), ...meta.map((a) => a.id)],
      unavailableMessage: null,
    },
  ];

  return { sections };
}

function plan(
  key: PortfolioSectionKey,
  atoms: PortfolioFactAtom[],
  unavailableMessage: string,
): PortfolioSectionPlan {
  if (atoms.length === 0) {
    return {
      key,
      status: "unavailable",
      atomIds: [],
      unavailableMessage,
    };
  }
  return {
    key,
    status: "include",
    atomIds: atoms.map((a) => a.id),
    unavailableMessage: null,
  };
}

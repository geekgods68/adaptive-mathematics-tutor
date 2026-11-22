export interface NavItem {
  href: string;
  label: string;
}

export const STUDENT_NAV: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/assessments", label: "Assessments" },
  { href: "/progress", label: "My Progress" },
  { href: "/history", label: "Session History" },
  { href: "/settings", label: "Settings" },
];

export const RESEARCH_NAV: NavItem[] = [
  { href: "/research", label: "Research Overview" },
  { href: "/research/experiments", label: "Experiment Designer" },
  { href: "/research/runs", label: "Simulation Runs" },
  { href: "/research/models", label: "Model Comparisons" },
  { href: "/research/results", label: "Results & Analytics" },
  { href: "/research/reproducibility", label: "Reproducibility" },
];

export type Workspace = "student" | "research";

export function workspaceForPathname(pathname: string): Workspace {
  return pathname.startsWith("/research") ? "research" : "student";
}

/** Exact match for "/" and "/research" (the two workspace homepages); prefix match otherwise, so a sub-path (e.g. a future /history/[id]) still highlights its parent nav item. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/" || item.href === "/research") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

import { getTurso } from "@/lib/turso";

export interface SeoChecklistItem {
  id: number;
  category: string;
  task: string;
  impact: string;
  done: boolean;
  updatedAt: string;
}

export async function ensureSeoChecklistTable() {
  const db = getTurso();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS seo_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      task TEXT NOT NULL,
      impact TEXT NOT NULL DEFAULT 'Medium',
      done INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export async function getSeoChecklist(): Promise<SeoChecklistItem[]> {
  const db = getTurso();
  const result = await db.execute(
    "SELECT id, category, task, impact, done, updated_at as updatedAt FROM seo_checklist ORDER BY id"
  );
  return result.rows.map((row) => ({
    id: row.id as number,
    category: row.category as string,
    task: row.task as string,
    impact: row.impact as string,
    done: (row.done as number) === 1,
    updatedAt: row.updatedAt as string,
  }));
}

export async function toggleSeoChecklistItem(id: number, done: boolean) {
  const db = getTurso();
  await db.execute({
    sql: "UPDATE seo_checklist SET done = ?, updated_at = datetime('now') WHERE id = ?",
    args: [done ? 1 : 0, id],
  });
}

export async function seedSeoChecklist() {
  const db = getTurso();
  const existing = await db.execute("SELECT COUNT(*) as count FROM seo_checklist");
  const count = Number(existing.rows[0].count);
  if (count > 0) return;

  const items: { category: string; task: string; impact: string; done: boolean }[] = [
    // Technical SEO
    { category: "Technical", task: "Install and configure next-sitemap", impact: "Critical", done: true },
    { category: "Technical", task: "Submit sitemap to Google Search Console", impact: "Critical", done: false },
    { category: "Technical", task: "Verify site in Google Search Console", impact: "Critical", done: false },
    { category: "Technical", task: "Set up Google Analytics 4", impact: "Critical", done: false },
    { category: "Technical", task: "Enable HTTPS (SSL via Vercel)", impact: "Critical", done: true },
    { category: "Technical", task: "Configure robots.txt (via next-sitemap)", impact: "High", done: true },
    { category: "Technical", task: "Add canonical URLs to all pages", impact: "High", done: false },
    { category: "Technical", task: "Set up 301 redirects for old URLs (if migrating)", impact: "High", done: false },
    { category: "Technical", task: "Optimize Core Web Vitals (LCP < 2.5s, CLS < 0.1)", impact: "High", done: false },
    { category: "Technical", task: "Use next/image for all images (WebP/AVIF auto)", impact: "High", done: true },
    { category: "Technical", task: "Use next/font for self-hosted fonts", impact: "Medium", done: false },
    { category: "Technical", task: "Add priority prop to hero/above-fold images", impact: "Medium", done: false },
    { category: "Technical", task: "Implement proper 404 page", impact: "Medium", done: false },

    // On-Page SEO
    { category: "On-Page", task: "Unique title tag per page (50-60 chars)", impact: "Critical", done: true },
    { category: "On-Page", task: "Unique meta description per page (150-160 chars)", impact: "Critical", done: true },
    { category: "On-Page", task: "Open Graph tags (og:title, og:description, og:image)", impact: "High", done: true },
    { category: "On-Page", task: "Twitter Card meta tags", impact: "High", done: true },
    { category: "On-Page", task: "Proper heading hierarchy (one H1 per page)", impact: "High", done: false },
    { category: "On-Page", task: "Alt text on all images", impact: "High", done: false },
    { category: "On-Page", task: "Internal linking between related pages", impact: "High", done: false },
    { category: "On-Page", task: "Blog posts with keyword-optimized content", impact: "High", done: true },
    { category: "On-Page", task: "Structured breadcrumb navigation", impact: "Medium", done: true },
    { category: "On-Page", task: "Add FAQ sections to key pages", impact: "Medium", done: false },

    // Local SEO
    { category: "Local SEO", task: "Claim and optimize Google My Business profile", impact: "Critical", done: false },
    { category: "Local SEO", task: "Add Restaurant schema (JSON-LD) to homepage", impact: "Critical", done: true },
    { category: "Local SEO", task: "Add LocalBusiness schema to root layout", impact: "Critical", done: true },
    { category: "Local SEO", task: "NAP consistency (Name, Address, Phone) across site", impact: "High", done: true },
    { category: "Local SEO", task: "Create Yelp, TripAdvisor, and Facebook listings", impact: "High", done: false },
    { category: "Local SEO", task: "Post to Google My Business 2x/week", impact: "High", done: false },
    { category: "Local SEO", task: "Respond to all Google reviews within 24 hours", impact: "High", done: false },
    { category: "Local SEO", task: "Add city-specific keywords to key pages", impact: "Medium", done: false },

    // Content
    { category: "Content", task: "Publish all 5 pillar articles (cornerstone content)", impact: "Critical", done: false },
    { category: "Content", task: "Write spoke articles linking to pillars (2-3/week)", impact: "High", done: false },
    { category: "Content", task: "Add Recipe schema to recipe blog posts", impact: "High", done: false },
    { category: "Content", task: "Add FAQ schema markup to FAQ sections", impact: "High", done: false },
    { category: "Content", task: "Create city-specific local SEO content", impact: "Medium", done: false },
    { category: "Content", task: "Update and refresh content quarterly", impact: "Medium", done: false },
  ];

  for (const item of items) {
    await db.execute({
      sql: "INSERT INTO seo_checklist (category, task, impact, done) VALUES (?, ?, ?, ?)",
      args: [item.category, item.task, item.impact, item.done ? 1 : 0],
    });
  }
}

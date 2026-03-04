import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { BlogPost } from "./types";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files.map((filename) => {
    const filePath = path.join(BLOG_DIR, filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug: data.slug || filename.replace(".mdx", ""),
      title: data.title || "",
      date: data.date || "",
      description: data.description || "",
      keywords: data.keywords || [],
      cluster: data.cluster || "",
      type: data.type || "spoke",
      image: data.image || "/images/og-image.jpg",
      content,
    } as BlogPost;
  });

  // Sort by date descending
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export function getPostClusters(): string[] {
  const posts = getAllPosts();
  const clusters = new Set(posts.map((p) => p.cluster).filter(Boolean));
  return Array.from(clusters);
}

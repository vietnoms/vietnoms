import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/blog-data";
import { ArticleSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.image }],
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  // Get related posts (same cluster, different slug)
  const allPosts = getAllPosts();
  const related = allPosts
    .filter((p) => p.cluster === post.cluster && p.slug !== post.slug)
    .slice(0, 3);

  return (
    <>
      <ArticleSchema
        title={post.title}
        description={post.description}
        image={post.image}
        datePublished={post.date}
        slug={post.slug}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Blog", url: `${RESTAURANT.url}/blog` },
          { name: post.title, url: `${RESTAURANT.url}/blog/${post.slug}` },
        ]}
      />

      <article className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-gray-400">
            <Link href="/" className="hover:text-brand-red">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/blog" className="hover:text-brand-red">
              Blog
            </Link>{" "}
            / <span className="text-gray-900">{post.title}</span>
          </nav>

          {/* Header */}
          <header>
            <div className="flex gap-2 mb-3">
              {post.cluster && (
                <Badge variant="secondary">{post.cluster}</Badge>
              )}
              {post.type === "pillar" && <Badge>Guide</Badge>}
            </div>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {post.title}
            </h1>
            <time className="mt-4 block text-sm text-gray-400">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </header>

          {/* Content */}
          <div className="mt-10 prose prose-gray prose-lg max-w-none prose-headings:font-display prose-a:text-brand-red">
            <MDXRemote source={post.content} />
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="py-12 bg-surface-alt/50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-white mb-6">
              Related Articles
            </h2>
            <div className="grid gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <h3 className="font-semibold hover:text-brand-red transition-colors">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-1">
                    {r.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

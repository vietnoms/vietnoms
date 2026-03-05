import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getPostClusters } from "@/lib/blog-data";
import { BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Blog | Vietnamese Food Guides & Recipes",
  description:
    "Explore Vietnamese food culture, recipes, and guides. Learn about bun bowls, banh mi, Vietnamese coffee, and more from Vietnoms in San Jose.",
  openGraph: {
    title: "Vietnoms Blog | Vietnamese Food Guides & Recipes",
    description:
      "Vietnamese food culture, recipes, and guides from Vietnoms.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const clusters = getPostClusters();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Blog", url: `${RESTAURANT.url}/blog` },
        ]}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Blog
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            Vietnamese food guides, recipes, and stories from our kitchen.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Cluster filters */}
          {clusters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <Badge variant="default" className="cursor-pointer">
                All
              </Badge>
              {clusters.map((cluster) => (
                <Badge
                  key={cluster}
                  variant="outline"
                  className="cursor-pointer"
                >
                  {cluster}
                </Badge>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                Blog posts coming soon! Check back for Vietnamese food guides,
                recipes, and stories.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-md transition-shadow h-full">
                    <div className="aspect-[16/9] bg-gray-800 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        {post.title}
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        {post.cluster && (
                          <Badge variant="secondary" className="text-xs">
                            {post.cluster}
                          </Badge>
                        )}
                        {post.type === "pillar" && (
                          <Badge variant="default" className="text-xs">
                            Guide
                          </Badge>
                        )}
                      </div>
                      <h2 className="font-display text-lg font-semibold group-hover:text-brand-red transition-colors">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                        {post.description}
                      </p>
                      <time className="mt-3 block text-xs text-gray-400">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AboutSnippetProps {
  heading?: string;
  text1?: string;
  text2?: string;
  imageUrl?: string;
}

export function AboutSnippet({ heading, text1, text2, imageUrl }: AboutSnippetProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-yellow text-glow-yellow">
              {heading || "Our Story"}
            </h2>
            <div className="mt-1 h-1 w-16 bg-brand-red rounded-full shadow-sm shadow-red-500/50" />
            <p className="mt-6 text-gray-400 leading-relaxed">
              {text1 || "At Vietnoms, we bring the vibrant flavors of Vietnam to San Jose. Every dish is crafted with authentic recipes passed down through generations, using the freshest ingredients we can source."}
            </p>
            <p className="mt-4 text-gray-400 leading-relaxed">
              {text2 || "From our signature bun bowls to our crispy banh mi, each bite tells a story of tradition, passion, and the warmth of Vietnamese hospitality."}
            </p>
            <Button asChild variant="link" className="mt-4 px-0 text-base">
              <Link href="/about">Read Our Full Story &rarr;</Link>
            </Button>
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-800">
            {imageUrl ? (
              <img src={imageUrl} alt="About Vietnoms" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <span className="text-sm">Restaurant Photo</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

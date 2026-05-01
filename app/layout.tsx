import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RestaurantSchema } from "@/components/schema-markup";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { CartDrawer } from "@/components/order/cart-drawer";
import { SEO_DEFAULTS, RESTAURANT } from "@/lib/constants";
import { getContent } from "@/lib/db/site-content";
import { unstable_cache } from "next/cache";
import "./globals.css";

const getCachedOgImage = unstable_cache(
  () => getContent("og_image"),
  ["og-image"],
  { tags: ["site-content"], revalidate: 300 },
);

export async function generateMetadata(): Promise<Metadata> {
  const customOg = await getCachedOgImage().catch(() => null);
  const ogImage = customOg || SEO_DEFAULTS.ogImage;

  return {
    metadataBase: new URL(RESTAURANT.url),
    title: {
      default: SEO_DEFAULTS.title,
      template: `%s | ${RESTAURANT.name}`,
    },
    description: SEO_DEFAULTS.description,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: RESTAURANT.url,
      siteName: RESTAURANT.name,
      title: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <RestaurantSchema />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://vietnoms.com",
  generateRobotsTxt: true,
  changefreq: "weekly",
  priority: 0.7,
  exclude: [
    "/order/confirmation",
    "/order/checkout",
    "/terms",
    "/privacy",
    "/feedback/*",
    "/unsubscribe/*",
    "/admin",
    "/admin/*",
    "/api/*",
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/order/confirmation",
          "/order/checkout",
          "/feedback/",
          "/unsubscribe/",
          "/admin/",
        ],
      },
    ],
  },
  transform: async (config, path) => {
    // Custom priorities per route
    let priority = 0.7;
    let changefreq = "weekly";

    if (path === "/") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path === "/menu") {
      priority = 0.9;
      changefreq = "daily";
    } else if (path.startsWith("/menu/")) {
      priority = 0.8;
      changefreq = "weekly";
    } else if (path === "/order") {
      priority = 0.8;
    } else if (path === "/catering") {
      priority = 0.8;
    } else if (path === "/specials") {
      priority = 0.8;
      changefreq = "daily";
    } else if (path === "/rewards") {
      priority = 0.8;
    } else if (path === "/faq") {
      priority = 0.6;
    } else if (path === "/careers") {
      priority = 0.4;
    } else if (path === "/blog") {
      priority = 0.8;
      changefreq = "daily";
    } else if (path.startsWith("/blog/")) {
      priority = 0.7;
      changefreq = "monthly";
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};

import { config, fields, collection, singleton } from "@keystatic/core";

const storage =
  process.env.NODE_ENV === "production" && process.env.KEYSTATIC_GITHUB_CLIENT_ID
    ? {
        kind: "github" as const,
        repo: "vietnoms/vietnoms" as const,
      }
    : { kind: "local" as const };

export default config({
  storage,
  singletons: {
    homePage: singleton({
      label: "Home Page",
      path: "content/pages/home",
      schema: {
        heroTitle: fields.text({ label: "Hero Title", defaultValue: "Authentic Vietnamese Cuisine" }),
        heroSubtitle: fields.text({
          label: "Hero Subtitle",
          defaultValue: "Bun bowls, crispy banh mi, nuoc mam wings, and Vietnamese coffee. Made with love in San Jose.",
          multiline: true,
        }),
        aboutHeading: fields.text({ label: "About Heading", defaultValue: "Our Story" }),
        aboutText1: fields.text({
          label: "About Paragraph 1",
          defaultValue:
            "At Vietnoms, we bring the vibrant flavors of Vietnam to San Jose. Every dish is crafted with authentic recipes passed down through generations, using the freshest ingredients we can source.",
          multiline: true,
        }),
        aboutText2: fields.text({
          label: "About Paragraph 2",
          defaultValue:
            "From our signature bun bowls to our crispy banh mi, each bite tells a story of tradition, passion, and the warmth of Vietnamese hospitality.",
          multiline: true,
        }),
      },
    }),
    aboutPage: singleton({
      label: "About Page",
      path: "content/pages/about",
      schema: {
        heroSubtitle: fields.text({
          label: "Hero Subtitle",
          defaultValue: "From humble beginnings to San Jose's favorite Vietnamese restaurant.",
          multiline: true,
        }),
        originTitle: fields.text({ label: "Origin Section Title", defaultValue: "How It Started" }),
        originText1: fields.text({
          label: "Origin Paragraph 1",
          defaultValue:
            "Vietnoms was born from a deep love for Vietnamese food and a desire to share authentic flavors with the San Jose community. Our recipes have been passed down through generations, perfected over decades of family cooking.",
          multiline: true,
        }),
        originText2: fields.text({
          label: "Origin Paragraph 2",
          defaultValue:
            'What started as a dream became reality when we opened our doors, serving the same dishes that brought our family together around the dinner table — hearty bun bowls, crispy banh mi, and refreshing Vietnamese coffee.',
          multiline: true,
        }),
        values: fields.array(
          fields.object({
            title: fields.text({ label: "Title" }),
            description: fields.text({ label: "Description", multiline: true }),
          }),
          {
            label: "Values",
            itemLabel: (props) => props.fields.title.value,
          }
        ),
      },
    }),
    cateringPage: singleton({
      label: "Catering Page",
      path: "content/pages/catering",
      schema: {
        heroSubtitle: fields.text({
          label: "Hero Subtitle",
          defaultValue: "Bring the bold flavors of Vietnam to your next event. From corporate lunches to weddings, we've got you covered.",
          multiline: true,
        }),
        packages: fields.array(
          fields.object({
            name: fields.text({ label: "Package Name" }),
            price: fields.text({ label: "Price" }),
            minGuests: fields.integer({ label: "Minimum Guests", defaultValue: 20 }),
            description: fields.text({ label: "Description", multiline: true }),
            includes: fields.array(fields.text({ label: "Item" }), {
              label: "Includes",
              itemLabel: (props) => props.value,
            }),
          }),
          {
            label: "Catering Packages",
            itemLabel: (props) => props.fields.name.value,
          }
        ),
      },
    }),
  },
  collections: {
    menuItemContent: collection({
      label: "Menu Item Content",
      slugField: "squareItemId",
      path: "content/menu-items/*",
      schema: {
        squareItemId: fields.text({ label: "Square Item ID", validation: { isRequired: true } }),
        story: fields.text({ label: "Story/Origin", multiline: true }),
        seoDescription: fields.text({ label: "SEO Description", multiline: true }),
      },
    }),
    blogPosts: collection({
      label: "Blog Posts",
      slugField: "slug",
      path: "content/blog/*",
      format: { contentField: "content" },
      entryLayout: "content",
      schema: {
        title: fields.text({ label: "Title", validation: { isRequired: true } }),
        slug: fields.text({ label: "Slug", validation: { isRequired: true } }),
        date: fields.date({ label: "Date", validation: { isRequired: true } }),
        description: fields.text({ label: "Description", multiline: true }),
        keywords: fields.array(fields.text({ label: "Keyword" }), {
          label: "Keywords",
          itemLabel: (props) => props.value,
        }),
        cluster: fields.text({ label: "Cluster" }),
        type: fields.select({
          label: "Type",
          options: [
            { label: "Pillar", value: "pillar" },
            { label: "Spoke", value: "spoke" },
          ],
          defaultValue: "spoke",
        }),
        image: fields.text({ label: "Image Path", defaultValue: "/images/og-image.jpg" }),
        content: fields.mdx({ label: "Content" }),
      },
    }),
  },
});

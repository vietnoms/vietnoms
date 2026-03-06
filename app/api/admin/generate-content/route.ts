import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

const CONTENT_PROMPTS: Record<
  string,
  (topic: string, keywords: string, city: string) => string
> = {
  blog: (t, kw, city) =>
    `Write a 1200-1500 word SEO-optimized blog post for Vietnoms, a Vietnamese restaurant in ${city || "San Jose, CA"}.

Topic: "${t}"

Requirements:
- Conversational, warm tone — like a friend who really knows Vietnamese food
- Include target keywords naturally: ${kw || "vietnamese food, vietnamese restaurant"}
- Use H2 and H3 subheadings (markdown format)
- Include a meta title (50-60 chars) and meta description (150-160 chars) at the top
- Internal links to /menu, /order, /catering where relevant
- End with a CTA to visit or order from Vietnoms
- Include 2-3 FAQs at the bottom

Format as markdown.`,

  meta: (t, kw, city) =>
    `Generate a complete meta tags package for this page on Vietnoms' website (Vietnamese restaurant in ${city || "San Jose, CA"}):

Page topic: "${t}"
Target keywords: ${kw || "vietnamese food, vietnamese restaurant"}

Generate:
1. Title tag (50-60 characters, include primary keyword + brand)
2. Meta description (150-160 characters, include CTA)
3. Open Graph title
4. Open Graph description (slightly different from meta desc)
5. Twitter card title and description
6. 5 suggested URL slugs (short, keyword-rich)
7. H1 tag suggestion
8. 3 related internal pages to link to

Format each clearly with labels.`,

  recipe: (t, kw, city) =>
    `Write a recipe blog post for Vietnoms (Vietnamese restaurant in ${city || "San Jose, CA"}) about: "${t}"

Requirements:
- 800-1200 words total
- Include a 2-3 paragraph intro with story/context about the dish
- Recipe card section: prep time, cook time, servings, ingredients list, numbered steps
- "Pro Tips" section with 3-4 insider tips
- Keywords to include: ${kw || "vietnamese recipe, vietnamese cooking"}
- Meta title and description at top
- End with "Visit Vietnoms" CTA — mention that you can order this dish instead of cooking it

Format as markdown. Include a note at the top saying "Add Recipe schema for: prep time, cook time, servings, ingredients, steps"`,

  gmb: (t, kw, city) =>
    `Write 5 Google My Business posts for Vietnoms, a Vietnamese restaurant in ${city || "San Jose, CA"}.

Theme/topic: "${t}"
Each post should be:
- 150-300 words
- Include a CTA (Order Now, Learn More, Call Now, or Visit Us)
- Mention specific menu items when relevant
- Include 1-2 relevant keywords naturally
- Be varied in tone: promotional, educational, community, seasonal, behind-the-scenes

Keywords to include where natural: ${kw || "vietnamese food, pho, banh mi"}

Label each post with a suggested posting date (spread across the week).`,

  faq: (t, kw, city) =>
    `Generate 8-10 FAQ questions and answers about: "${t}" for Vietnoms, a Vietnamese restaurant in ${city || "San Jose, CA"}.

Requirements:
- Questions should match actual Google search queries (People Also Ask style)
- Answers should be 2-4 sentences, informative, naturally include keywords
- Include a mix of: general knowledge, "near me" local intent, and restaurant-specific
- Keywords: ${kw || "vietnamese food, vietnamese restaurant"}
- Format as Q: and A: pairs

These will be added as FAQ schema markup for rich snippets.`,

  local: (t, kw, city) =>
    `Write a local SEO-optimized blog post for Vietnoms in ${city || "San Jose, CA"} about: "${t}"

Requirements:
- 800-1000 words
- Mention ${city || "San Jose"} naturally 5-8 times
- Reference local landmarks, neighborhoods, or events
- Include "near me" and "${city || "San Jose"} + vietnamese food" keyword patterns
- Meta title and description at top
- Internal links to /menu, /catering, /contact
- End with driving directions or "visit us" CTA
- Include 2 FAQ questions with local intent

Format as markdown.`,
};

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { contentType, topic, keywords, city } = await request.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const promptFn = CONTENT_PROMPTS[contentType];
    if (!promptFn) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const prompt = promptFn(topic, keywords || "", city || "");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", errData);
      return NextResponse.json(
        { error: "Content generation failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text =
      data.content?.map((b: { text?: string }) => b.text || "").join("\n") ||
      "No response generated";

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error("Generate content error:", error);
    return NextResponse.json(
      { error: "Content generation failed" },
      { status: 500 }
    );
  }
}

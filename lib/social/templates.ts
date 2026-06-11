/**
 * Template-based social caption drafts — no LLM dependency, instant, and
 * always on-brand. The composer cycles through variants.
 */

const HASHTAGS =
  "#vietnoms #vietnamesefood #sanjoseeats #sofamarket #bayareafood";

export interface DraftInput {
  name: string;
  description?: string;
  formattedPrice?: string;
}

function clean(text: string | undefined): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

export function draftFromMenuItem(item: DraftInput): string[] {
  const description = clean(item.description);
  const priceTag = item.formattedPrice ? ` (${item.formattedPrice})` : "";
  const descriptionLine = description ? `\n\n${description}` : "";

  return [
    `${item.name}${priceTag} — made fresh today at Vietnoms.${descriptionLine}\n\nOrder pickup at vietnoms.com/order or find us inside SoFa Market, downtown San Jose.\n\n${HASHTAGS}`,
    `Craving something good? The ${item.name} is calling.${descriptionLine}\n\nSkip the line — order ahead at vietnoms.com/order.\n\n${HASHTAGS}`,
    `Today's move: ${item.name}${priceTag}.${descriptionLine}\n\nOrder ahead at vietnoms.com/order — 387 S 1st St, San Jose, inside SoFa Market.\n\n${HASHTAGS}`,
  ].map((caption) => caption.slice(0, 2200));
}

export function draftFromSpecial(special: {
  title: string;
  body?: string | null;
  endsAt?: string | null;
}): string[] {
  const body = clean(special.body || "");
  const bodyLine = body ? `\n\n${body}` : "";

  let urgency = "Limited time only.";
  if (special.endsAt) {
    const date = new Date(special.endsAt);
    if (!Number.isNaN(date.getTime())) {
      urgency = `Only through ${date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })}.`;
    }
  }

  return [
    `${special.title}${bodyLine}\n\n${urgency} Order at vietnoms.com/order.\n\n${HASHTAGS}`,
    `New at Vietnoms: ${special.title}${bodyLine}\n\n${urgency} Don't sleep on it.\n\n${HASHTAGS}`,
  ].map((caption) => caption.slice(0, 2200));
}

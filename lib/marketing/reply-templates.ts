/**
 * Reply templates for responding to Google/Yelp reviews. The Places API
 * cannot post replies, so the admin dashboard offers these as starting
 * points to copy into Google Business Profile.
 */

export interface ReplyTemplate {
  tone: string;
  text: string;
}

function firstName(authorName: string): string {
  const name = authorName.trim().split(/\s+/)[0];
  return name || "there";
}

export function buildReplyTemplates(review: {
  authorName: string;
  rating: number;
}): ReplyTemplate[] {
  const name = firstName(review.authorName);

  if (review.rating >= 4) {
    return [
      {
        tone: "Warm",
        text: `Thank you so much, ${name}! We're thrilled you enjoyed your visit. Can't wait to cook for you again soon. — The Vietnoms Team`,
      },
      {
        tone: "Personal",
        text: `${name}, this made our day! Reviews like yours are why we do what we do. See you at SoFa Market soon! — Vietnoms`,
      },
      {
        tone: "Brief",
        text: `Thank you, ${name}! We appreciate you and hope to see you again soon. — Vietnoms`,
      },
    ];
  }

  if (review.rating === 3) {
    return [
      {
        tone: "Apologetic",
        text: `Hi ${name}, thank you for the honest feedback. We'd love to hear more about what we could have done better — please reach out at catering@vietnoms.com so we can make it right. — Vietnoms`,
      },
      {
        tone: "Inviting",
        text: `Thanks for visiting, ${name}. It sounds like we left room to improve, and we take that seriously. We hope you'll give us another chance to earn that next star. — The Vietnoms Team`,
      },
    ];
  }

  return [
    {
      tone: "Make it right",
      text: `Hi ${name}, we're really sorry your experience fell short — that's not the standard we hold ourselves to. Please email us at catering@vietnoms.com or call (408) 827-5812 so we can make this right. — Vietnoms`,
    },
    {
      tone: "Accountable",
      text: `${name}, thank you for telling us. We clearly missed the mark, and we'd like the chance to fix it. Please reach out at catering@vietnoms.com — your next meal is on us while we sort this out. — The Vietnoms Team`,
    },
  ];
}

import {
  getDuePosts,
  getSocialPost,
  recordPublishResult,
  type SocialPost,
} from "@/lib/db/social-posts";
import {
  isMetaConfigured,
  publishToFacebook,
  publishToInstagram,
} from "@/lib/social/meta";

export interface PublishSummary {
  published: number;
  ready: number;
  failed: number;
}

/**
 * Attempt to publish one post to all of its platforms.
 * Without Meta configured, the post becomes `ready` (manual mode) so the
 * admin can copy the caption and post by hand.
 */
export async function publishPost(post: SocialPost): Promise<
  | { status: "published"; externalIds: Record<string, string> }
  | { status: "ready" }
  | { status: "failed"; error: string }
> {
  if (!isMetaConfigured()) {
    return { status: "ready" };
  }

  const externalIds: Record<string, string> = {};
  const errors: string[] = [];

  for (const platform of post.platforms) {
    if (platform === "facebook") {
      const outcome = await publishToFacebook({
        message: post.body,
        imageUrl: post.mediaUrl,
      });
      if (outcome.ok && outcome.externalId) {
        externalIds.facebook = outcome.externalId;
      } else {
        errors.push(`facebook: ${outcome.error}`);
      }
    } else if (platform === "instagram") {
      if (!post.mediaUrl) {
        errors.push("instagram: an image is required");
        continue;
      }
      const outcome = await publishToInstagram({
        caption: post.body,
        imageUrl: post.mediaUrl,
      });
      if (outcome.ok && outcome.externalId) {
        externalIds.instagram = outcome.externalId;
      } else {
        errors.push(`instagram: ${outcome.error}`);
      }
    }
  }

  if (Object.keys(externalIds).length > 0) {
    // Partial success still counts as published; surface any per-platform errors
    return { status: "published", externalIds };
  }
  return { status: "failed", error: errors.join("; ") || "No platforms selected" };
}

/** Publish all scheduled posts whose time has come. */
export async function publishDueSocialPosts(): Promise<PublishSummary> {
  const summary: PublishSummary = { published: 0, ready: 0, failed: 0 };
  const due = await getDuePosts(new Date().toISOString());

  for (const post of due) {
    const outcome = await publishPost(post);
    await recordPublishResult(post.id, outcome);
    if (outcome.status === "published") summary.published++;
    else if (outcome.status === "ready") summary.ready++;
    else summary.failed++;
  }

  return summary;
}

/** Publish a single post immediately (admin "Publish now"). */
export async function publishNow(postId: number): Promise<
  | { status: "published"; externalIds: Record<string, string> }
  | { status: "ready" }
  | { status: "failed"; error: string }
  | { status: "not_found" }
> {
  const post = await getSocialPost(postId);
  if (!post) return { status: "not_found" };

  const outcome = await publishPost(post);
  await recordPublishResult(postId, outcome);
  return outcome;
}

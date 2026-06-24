/**
 * Meta (Facebook Page + Instagram Business) publishing via the Graph API.
 *
 * Required env vars (all optional — unconfigured means "manual mode"):
 *   META_PAGE_ID            Facebook Page ID
 *   META_PAGE_ACCESS_TOKEN  Page access token with pages_manage_posts
 *   META_IG_USER_ID         Instagram Business account ID (for IG publishing,
 *                           additionally needs instagram_content_publish)
 *
 * Tokens expire (~60 days for long-lived tokens) — see OWNER-GUIDE.md.
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface PublishOutcome {
  ok: boolean;
  externalId?: string;
  error?: string;
}

export function isMetaConfigured(): boolean {
  return !!process.env.META_PAGE_ID && !!process.env.META_PAGE_ACCESS_TOKEN;
}

export function isInstagramConfigured(): boolean {
  return isMetaConfigured() && !!process.env.META_IG_USER_ID;
}

async function graphPost(
  path: string,
  params: Record<string, string>
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const token = process.env.META_PAGE_ACCESS_TOKEN!;
    const body = new URLSearchParams({ ...params, access_token: token });
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
      method: "POST",
      body,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error?.message || `Graph API error ${res.status}`,
      };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function publishToFacebook(post: {
  message: string;
  imageUrl?: string | null;
}): Promise<PublishOutcome> {
  if (!isMetaConfigured()) {
    return { ok: false, error: "Meta is not configured" };
  }

  const pageId = process.env.META_PAGE_ID!;
  const result = post.imageUrl
    ? await graphPost(`${pageId}/photos`, {
        url: post.imageUrl,
        caption: post.message,
      })
    : await graphPost(`${pageId}/feed`, { message: post.message });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, externalId: result.data.post_id || result.data.id };
}

export async function publishToInstagram(post: {
  caption: string;
  imageUrl: string;
}): Promise<PublishOutcome> {
  if (!isInstagramConfigured()) {
    return { ok: false, error: "Instagram is not configured" };
  }

  const igUserId = process.env.META_IG_USER_ID!;

  // 1. Create a media container
  const container = await graphPost(`${igUserId}/media`, {
    image_url: post.imageUrl,
    caption: post.caption,
  });
  if (!container.ok || !container.data?.id) {
    return { ok: false, error: container.error || "Failed to create IG container" };
  }

  // 2. Publish the container (single images are usually ready immediately;
  //    retry briefly in case processing lags)
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const publish = await graphPost(`${igUserId}/media_publish`, {
      creation_id: container.data.id,
    });
    if (publish.ok && publish.data?.id) {
      return { ok: true, externalId: publish.data.id };
    }
    lastError = publish.error || "IG publish failed";
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { ok: false, error: lastError };
}

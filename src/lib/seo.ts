/**
 * Single source of truth for site-wide SEO / head metadata.
 *
 * Every route builds its head() through `buildHead()` so no brand sentence is
 * ever written twice. Per-page overrides exist only where a page deliberately
 * uses a different social headline than its page title.
 */

export const BRAND = "GEM.IQ";
export const BRAND_HUB = "GEM.IQ Hub";
export const PARENT_COMPANY = "GlobalEdgeMarkets";
export const SITE_ORIGIN = "https://gemiq.globaledgemarkets.com";

export const SITE_TITLE = "GEM.IQ — Executive assessments for global readiness";
export const SITE_DESCRIPTION =
  "The GEM.IQ platform by GlobalEdgeMarkets — a family of self-service assessments across GoToMarket Readiness, Digital/AI Experience, and Product/Service delivery";

/** Change this one line to swap the site-wide share image. */
export const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cbe36d85-77a8-43d1-8715-cca24676adbe/id-preview-5b7603c7--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app-1784424324631.png";

export type MetaTag = Record<string, string>;
export type LinkTag = Record<string, string>;

export type BuildHeadOptions = {
  /** Page <title>. Also the default for og:title / twitter:title. */
  title: string;
  /** Meta description. Also the default for og:description / twitter:description. */
  description: string;
  /** Path such as "/docs". When set, emits og:url and (unless disabled) a canonical link. */
  path?: string;
  /** Emit og:url for the path. Defaults to true when `path` is set. */
  ogUrl?: boolean;
  /** Emit rel=canonical for the path. Defaults to true when `path` is set. */
  canonical?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  /** Omit to emit no twitter tags at all. */
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  /** Absolute URL; emits og:image + twitter:image. */
  image?: string;
  /** e.g. "noindex" or "noindex, nofollow". */
  robots?: string;
  author?: string;
  /** Tags prepended before the generated ones (charSet, viewport, ...). */
  leadingMeta?: MetaTag[];
  links?: LinkTag[];
};

export function buildHead(opts: BuildHeadOptions): { meta: MetaTag[]; links: LinkTag[] } {
  const {
    title,
    description,
    path,
    ogUrl = path !== undefined,
    canonical = path !== undefined,
    ogTitle = title,
    ogDescription = description,
    ogType = "website",
    twitterCard,
    twitterTitle = ogTitle,
    twitterDescription = ogDescription,
    image,
    robots,
    author,
    leadingMeta = [],
    links = [],
  } = opts;

  const url = path === undefined ? undefined : `${SITE_ORIGIN}${path}`;

  const meta: MetaTag[] = [...leadingMeta];
  meta.push({ title });
  meta.push({ name: "description", content: description });
  if (author) meta.push({ name: "author", content: author });
  meta.push({ property: "og:title", content: ogTitle });
  meta.push({ property: "og:description", content: ogDescription });
  meta.push({ property: "og:type", content: ogType });
  if (url && ogUrl) meta.push({ property: "og:url", content: url });
  if (twitterCard) {
    meta.push({ name: "twitter:card", content: twitterCard });
    meta.push({ name: "twitter:title", content: twitterTitle });
    if (twitterDescription) {
      meta.push({ name: "twitter:description", content: twitterDescription });
    }
  }
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }
  if (robots) meta.push({ name: "robots", content: robots });

  const allLinks: LinkTag[] = [...links];
  if (url && canonical) allLinks.push({ rel: "canonical", href: url });

  return { meta, links: allLinks };
}

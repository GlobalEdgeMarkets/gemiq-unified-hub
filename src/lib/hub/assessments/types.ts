/**
 * Assessment registry types.
 *
 * Each IQ (TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ, and any future one)
 * ships a small spec file under this folder that declares:
 *   1. Its own HubSpot contact properties (for bootstrap creation).
 *   2. A pure function that maps a single submission → HubSpot property values.
 *
 * The Hub is the ONLY writer to HubSpot; IQs never call HubSpot directly.
 * Adding a new IQ = create one file here and register it in ./index.ts.
 */

export type PropertyType =
  | "string"
  | "number"
  | "date"
  | "datetime"
  | "bool"
  | "enum"        // single-select
  | "multi_enum"; // multi-checkbox

export interface PropertyDef {
  /** Internal HubSpot property name (must start `gem_`). */
  name: string;
  /** Human label shown in HubSpot UI. */
  label: string;
  type: PropertyType;
  /** For enum / multi_enum properties. */
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

/** Shape of a stored submission as visible to a spec's mapper. */
export interface SubmissionForMapping {
  email: string;
  assessment_key: string;
  score: number | null;
  tier: string | null;
  dimensions: Record<string, unknown> | null;
  detail: Record<string, unknown> | null;
  submitted_at: string; // ISO
}

export type HubSpotPropertyValues = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface AssessmentSpec {
  key: string;                 // e.g. "tariffiq"
  displayName: string;         // e.g. "TariffIQ"
  /** HubSpot properties this IQ writes (bootstrap will create if missing). */
  contactProperties: PropertyDef[];
  /** Map the LATEST submission for this IQ → gem_* HubSpot values. */
  toContactProperties: (sub: SubmissionForMapping) => HubSpotPropertyValues;
}

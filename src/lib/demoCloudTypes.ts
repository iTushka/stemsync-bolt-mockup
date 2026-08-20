import type { PilotSlug } from '../config';

/** Row shapes as they come back from Supabase — snake_case, matching
 *  supabase/migrations/0001_demo_schema.sql. */

export interface DemoTenantRow {
  id: PilotSlug;
  display_name: string;
  default_currency: string;
  updated_at: string;
}

export interface DemoCategoryRow {
  id: string;
  tenant_id: PilotSlug;
  name: string;
  environment_label: string | null;
  environment_placeholder: string | null;
  name_hint: string | null;
  sort_order: number;
}

export interface DemoCategoryKeywordRow {
  id: string;
  tenant_id: PilotSlug;
  category_id: string;
  keyword: string;
}

export interface DemoProductRow {
  id: string;
  tenant_id: PilotSlug;
  category_id: string | null;
  name: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
  currency: string;
  supplier: string | null;
  tags: string[];
  image_url: string | null;
  environment: string | null;
  channels: { id: string; name: string; price?: number }[];
  aging: boolean;
  sold_out: boolean;
  aging_action: 'markdown' | 'bundle' | 'donate' | 'other' | null;
  aging_action_note: string | null;
  period_id: string | null;
  color: string | null;
  bulk_threshold: number | null;
  bulk_unit_price: number | null;
  season: string | null;
  variant_group: string | null;
  shop: string | null;
  sort_order: number;
  created_at_ms: number;
}

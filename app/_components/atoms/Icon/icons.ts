export const ICON_NAMES = [
  "dashboard",
  "point_of_sale",
  "inventory_2",
  "receipt_long",
  "contact_support",
  "account_circle",
  "search",
  "notifications",
  "help_outline",
  "settings",
  "add",
  "trending_up",
  "trending_down",
  "agriculture",
  "warning",
  "grain",
  "science",
  "energy_savings_leaf",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

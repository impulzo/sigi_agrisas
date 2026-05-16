import type { IconName } from "../../atoms/Icon/icons";

export interface RailItem {
  key: string;
  href: string;
  icon: IconName;
  label: string;
}

export const primaryItems: RailItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "dashboard", label: "Inicio" },
  { key: "pos", href: "/pos", icon: "point_of_sale", label: "POS" },
  { key: "inventory", href: "/inventory", icon: "inventory_2", label: "Inventory" },
  { key: "billing", href: "/billing", icon: "receipt_long", label: "Billing" },
];

export const secondaryItems: RailItem[] = [
  { key: "support", href: "/support", icon: "contact_support", label: "Support" },
  { key: "account", href: "/account", icon: "account_circle", label: "Account" },
];

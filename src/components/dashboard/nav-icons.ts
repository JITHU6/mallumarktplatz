import {
  BadgeCheck,
  Building2,
  Flag,
  FolderTree,
  Heart,
  LayoutDashboard,
  MapPin,
  Settings,
  Store,
  User,
  Users,
} from "lucide-react";

export const navIcons = {
  overview: LayoutDashboard,
  businesses: Store,
  favourites: Heart,
  profile: User,
  settings: Settings,
  adminBusinesses: Building2,
  users: Users,
  categories: FolderTree,
  cities: MapPin,
  reports: Flag,
  verifications: BadgeCheck,
};

export type NavIconKey = keyof typeof navIcons;

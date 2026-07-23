import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Briefcase,
  Calendar,
  CircleDot,
  FileText,
  FolderOpen,
  Home,
  LayoutGrid,
  Map,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Heuristic nav glyphs for Collections-style bottom pill.
 * Figma Make uses custom SVGs; products get Lucide stand-ins by page id/label.
 */
export function productNavIcon(id: string, label: string): LucideIcon {
  const key = `${id} ${label}`.toLowerCase();
  if (/home|feed|trove|discover|inbox/.test(key)) return Home;
  if (/search|find|explore|lookup/.test(key)) return Search;
  if (/collection|library|saved|bookmark|list/.test(key)) return Bookmark;
  if (/chat|assistant|coach|lab|prep|workspace|draft|ai/.test(key)) return MessageSquare;
  if (/project|folder|files?/.test(key)) return FolderOpen;
  if (/people|patient|team|contact|user/.test(key)) return Users;
  if (/map|trip|travel|route/.test(key)) return Map;
  if (/calendar|schedule|agenda/.test(key)) return Calendar;
  if (/job|career|apply|application/.test(key)) return Briefcase;
  if (/money|budget|wallet|finance|pay/.test(key)) return Wallet;
  if (/doc|report|note|resume/.test(key)) return FileText;
  if (/setting|pref|account/.test(key)) return Settings;
  if (/grid|board|dashboard|overview/.test(key)) return LayoutGrid;
  if (/spark|create|new|magic/.test(key)) return Sparkles;
  return CircleDot;
}

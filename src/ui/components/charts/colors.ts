export const CATEGORY_COLORS: Record<string, string> = {
  feature: 'hsl(220, 70%, 50%)',
  bugfix: 'hsl(0, 72%, 51%)',
  refactor: 'hsl(270, 60%, 55%)',
  research: 'hsl(45, 90%, 48%)',
  config: 'hsl(160, 60%, 40%)',
  docs: 'hsl(190, 70%, 45%)',
  other: 'hsl(0, 0%, 50%)',
};

export const CATEGORY_COLORS_DARK: Record<string, string> = {
  feature: 'hsl(220, 70%, 60%)',
  bugfix: 'hsl(0, 62%, 55%)',
  refactor: 'hsl(270, 60%, 65%)',
  research: 'hsl(45, 85%, 55%)',
  config: 'hsl(160, 55%, 50%)',
  docs: 'hsl(190, 65%, 55%)',
  other: 'hsl(0, 0%, 60%)',
};

export const PROJECT_PALETTE = [
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 40%)',
  'hsl(270, 60%, 55%)',
  'hsl(45, 90%, 48%)',
  'hsl(0, 72%, 51%)',
  'hsl(190, 70%, 45%)',
  'hsl(320, 60%, 50%)',
  'hsl(30, 80%, 50%)',
  'hsl(100, 50%, 40%)',
  'hsl(250, 50%, 60%)',
];

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
}

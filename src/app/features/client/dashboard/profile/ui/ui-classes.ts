/** Classes Tailwind partagées (couleurs définies dans styles.css : agri, badge-bg, grey-*, danger). */
export const UI = {
  input:
    'w-full rounded-lg border border-grey-400 bg-white px-3 py-2 text-sm focus:border-agri focus:outline-none focus:ring-1 focus:ring-agri',
  label: 'mb-1 block text-xs font-medium text-grey-700',
  primary:
    'cursor-pointer rounded-lg bg-agri px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'cursor-pointer rounded-lg border border-agri bg-badge-bg px-3 py-1.5 text-xs font-medium text-agri disabled:opacity-50',
  panel: 'rounded-xl border border-grey-200 bg-white p-4',
  error: 'text-xs text-danger',
  success: 'text-xs text-success',
} as const;

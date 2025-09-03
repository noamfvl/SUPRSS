export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString() : '';

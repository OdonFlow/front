import type { CSSProperties } from 'react';
const paths = {
  wallet: 'M3 6h17v15H3V6Zm0 0V3h14v3m-1 6h5v5h-5v-5Zm1 2h1',
  card: 'M3 4h18v16H3V4Zm0 5h18M6 15h4',
  tooth: 'M12 5C9 3 5 3 5 8c0 4 2 12 4 12 2 0 1-7 3-7s1 7 3 7c2 0 4-8 4-12 0-5-4-5-7-3Z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6',
  settings:
    'm9 3 1-1h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1V3Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  check: 'm5 12 4 4L19 6',
  mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
  phone: 'M8 3H4c-2 10 7 19 17 17v-4l-5-2-2 2a14 14 0 0 1-6-6l2-2-2-5Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  print: 'M6 9V2h12v7M6 18H3V9h18v9h-3M6 14h12v8H6v-8Z',
  heart: 'M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-6 4 0 11 8 16 8-5 14-12 8-16Z',
  alert: 'M12 3 2 21h20L12 3Zm0 5v6m0 3v1',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}

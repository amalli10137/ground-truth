import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'gt:theme';
const subs = new Set<() => void>();

function initial(): Theme {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'light' || s === 'dark') return s;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let theme: Theme = initial();

function apply() {
  document.documentElement.dataset.theme = theme;
}
apply();

export const getTheme = (): Theme => theme;

export function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  apply();
  subs.forEach((f) => f());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => theme,
  );
}

/** Canvas-drawn chart colors (uPlot doesn't read CSS vars). */
export interface ChartPalette {
  series: string;
  seriesFaint: string;
  red: string;
  axis: string;
  grid: string;
  shadePlay: string;
  shadeTruth: string;
  zero: string;
  overlays: string[];
}

export const CHART_PALETTES: Record<Theme, ChartPalette> = {
  light: {
    series: '#16305e',
    seriesFaint: 'rgba(22, 48, 94, 0.18)',
    red: '#b3261e',
    axis: '#47598a',
    grid: 'rgba(96, 130, 170, 0.25)',
    shadePlay: 'rgba(37, 84, 163, 0.10)',
    shadeTruth: 'rgba(179, 38, 30, 0.08)',
    zero: 'rgba(22, 48, 94, 0.5)',
    overlays: ['#7a3fa0', '#b06a00', '#00707a', '#a03f62'],
  },
  dark: {
    series: '#a8c2f0',
    seriesFaint: 'rgba(168, 194, 240, 0.20)',
    red: '#ff7b70',
    axis: '#93a3c4',
    grid: 'rgba(147, 163, 196, 0.16)',
    shadePlay: 'rgba(111, 156, 232, 0.13)',
    shadeTruth: 'rgba(255, 123, 112, 0.10)',
    zero: 'rgba(213, 222, 238, 0.5)',
    overlays: ['#c08ae0', '#e8a94e', '#4ecbd6', '#e07a9e'],
  },
};

export function useChartPalette(): ChartPalette {
  return CHART_PALETTES[useTheme()];
}

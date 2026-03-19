export type Theme = 'editorial-light' | 'midnight-data';
export type ChartType = 'bar' | 'line' | 'donut';

export interface KeyStat {
  label: string;
  value: string;
  context: string;
  sourceRef: string;
}

export interface FactSection {
  heading: string;
  body: string;
  sourceRef: string;
}

export interface TimelineItem {
  year: string;
  event: string;
  sourceRef: string;
}

export interface Comparison {
  label: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  sourceRef: string;
}

export interface Chart {
  type: ChartType;
  title: string;
  labels: string[];
  values: number[];
  sourceRef: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  note: string;
}

export interface InfographicData {
  title: string;
  subtitle: string;
  summary: string;
  theme: Theme;
  keyStats: KeyStat[];
  factSections: FactSection[];
  timeline: TimelineItem[];
  comparisons: Comparison[];
  charts: Chart[];
  sources: Source[];
  confidenceScore: number;
  lastResearched: string;
}

export type AppView = 'landing' | 'loading' | 'infographic' | 'error';

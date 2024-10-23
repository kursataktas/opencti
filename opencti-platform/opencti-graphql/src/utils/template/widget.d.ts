import type { FilterGroup } from '../../generated/graphql';

interface WidgetColumn {
  attribute: string
  displayStyle?: string
  label?: string
}

interface WidgetDataSelection {
  label?: string
  number?: number
  attribute?: string
  date_attribute?: string
  centerLat?: number
  centerLng?: number
  zoom?: number
  isTo?: boolean
  perspective?: 'entities' | 'relationships' | 'audits' | null
  filters?: FilterGroup
  dynamicFrom?: FilterGroup
  dynamicTo?: FilterGroup
  columns: WidgetColumn[]
}

interface WidgetParameters {
  title?: string
  interval?: string
  stacked?: boolean
  legend?: boolean
  distributed?: boolean
}

interface WidgetLayout {
  w: number
  h: number
  x: number
  y: number
  i: string
  moved: boolean
  static: boolean
}

export interface Widget {
  id: string;
  type: string;
  perspective: 'entities' | 'relationships' | 'audits' | null
  dataSelection: WidgetDataSelection[]
  parameters?: WidgetParameters
  layout?: WidgetLayout
}
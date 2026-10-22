export const HALL_WIDTH = 1000;
export const HALL_HEIGHT = 600;

export interface HallItem {
  type: 'symbol' | 'text' | 'shape';
  layer?: string;
  name?: string | null;
  symbol?: number;
  tx?: number;
  ty?: number;
  scaleX?: number;
  scaleY?: number;
  img?: string | null;
  text?: string;
  width?: number;
  height?: number;
  size?: number;
  color?: string;
  rotation?: number;
  visible?: boolean;
  action?: 'dialog' | 'navigate' | 'event' | 'none';
  title?: string;
  destination?: string;
}

export const HALL_LOCATIONS: Readonly<Record<string, string>> = {
  shop_mc: 'Loja',
  roomList_mc: 'Lista de salas',
  store_mc: 'Armazém',
  consortia_mc: 'Sociedade',
  hotWell_mc: 'Spa',
  tofflist_mc: 'Classificação',
  campaignLab_mc: 'Laboratório de campanhas',
  civil_mc: 'Centro civil',
  active_mc: 'Atividades',
  auction_mc: 'Leilão',
  dungeon_mc: 'Masmorras',
  church_mc: 'Igreja',
  lottery_mc: 'Loteria',
};

export function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Flash's smaller layer numbers are in front, just as in js/hall.js. */
export function hallLayer(item: HallItem, index: number): number {
  const layer = Number(item.layer?.match(/\d+/)?.[0]);
  return Number.isFinite(layer) && layer > 0 ? 1000 - layer : 500 - index;
}

export function fitHall(width: number, height: number): { scale: number; x: number; y: number } {
  const w = Math.max(0, finiteOr(width, 0));
  const h = Math.max(0, finiteOr(height, 0));
  const scale = Math.min(w / HALL_WIDTH, h / HALL_HEIGHT);
  return { scale, x: (w - HALL_WIDTH * scale) / 2, y: (h - HALL_HEIGHT * scale) / 2 };
}

export function hallLocation(item: HallItem): string | null {
  return item.type === 'symbol' && item.name && !item.name.startsWith('txt_')
    ? item.name
    : null;
}

/** Resolve the legacy relative paths without modifying the original config. */
export function hallAssetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

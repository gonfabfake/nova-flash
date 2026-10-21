import { describe, expect, it } from 'vitest';
import {
  finiteOr, fitHall, hallAssetPath, hallLayer, hallLocation, type HallItem,
} from '../src/scenes/hall-model';

describe('original hall layer order', () => {
  it('draws lower Flash layer numbers above higher numbers', () => {
    const entries: HallItem[] = [
      { type: 'symbol', layer: 'Layer 1' },
      { type: 'symbol', layer: 'Layer 49' },
      { type: 'text', layer: 'Layer 52' },
    ];
    expect(entries.map(hallLayer)).toEqual([999, 951, 948]);
    expect([...entries].sort((a, b) => hallLayer(a, 0) - hallLayer(b, 0)))
      .toEqual([entries[2], entries[1], entries[0]]);
  });

  it('preserves the legacy fallback for missing or invalid layers', () => {
    expect(hallLayer({ type: 'symbol' }, 3)).toBe(497);
    expect(hallLayer({ type: 'symbol', layer: 'Layer 0' }, 2)).toBe(498);
  });
});

describe('1000 × 600 hall fit', () => {
  it('keeps original coordinates at native resolution', () => {
    expect(fitHall(1000, 600)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('letterboxes wide and tall containers without distorting the scene', () => {
    expect(fitHall(1400, 600)).toEqual({ scale: 1, x: 200, y: 0 });
    expect(fitHall(500, 600)).toEqual({ scale: 0.5, x: 0, y: 150 });
    expect(fitHall(2000, 1200)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('does not overflow a collapsed container or produce invalid transforms', () => {
    expect(fitHall(0, 0)).toEqual({ scale: 0, x: 0, y: 0 });
    expect(fitHall(Number.NaN, -1)).toEqual({ scale: 0, x: 0, y: 0 });
  });

  it('retains exported negative, fractional, and zero scales', () => {
    expect(finiteOr(-0.2904052734375, 1)).toBe(-0.2904052734375);
    expect(finiteOr(0, 1)).toBe(0);
    expect(finiteOr(undefined, 1)).toBe(1);
    expect(finiteOr(Number.NaN, 1)).toBe(1);
  });
});

describe('hall selection and image paths', () => {
  it('selects named locations, never decorative or txt_* image labels', () => {
    expect(hallLocation({ type: 'symbol', name: 'shop_mc' })).toBe('shop_mc');
    expect(hallLocation({ type: 'symbol', name: 'txt_shop_mc' })).toBeNull();
    expect(hallLocation({ type: 'symbol', name: null })).toBeNull();
    expect(hallLocation({ type: 'text', name: 'svrname_txt' })).toBeNull();
  });

  it('makes original asset paths root-relative without changing their filenames', () => {
    expect(hallAssetPath('assets/symbols/DefineSprite_259/1.png'))
      .toBe('/assets/symbols/DefineSprite_259/1.png');
    expect(hallAssetPath('/assets/bg.png')).toBe('/assets/bg.png');
  });
});

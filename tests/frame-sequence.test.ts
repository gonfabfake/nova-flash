import { describe, it, expect } from 'vitest';
import { frameAt, sortFramePaths } from '../src/animations/frame-sequence';
describe('sequências originais', () => {
  it('ordena numericamente sem modificar a entrada', () => {
    const paths = ['10.png', '2.png', '1.png'];
    expect(sortFramePaths(paths)).toEqual(['1.png','2.png','10.png']);
    expect(paths[0]).toBe('10.png');
  });
  it('respeita FPS e reinicia no final', () => {
    expect(frameAt(500,24,24)).toBe(12);
    expect(frameAt(1000,24,24)).toBe(0);
    expect(frameAt(100,0,0)).toBe(0);
  });
});

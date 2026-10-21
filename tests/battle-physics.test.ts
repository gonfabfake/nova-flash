import { describe, it, expect } from 'vitest';
import { impactAtGround, launch, positionAt } from '../src/battles/physics';
describe('local battle trajectory model', () => {
  it('preserves launch direction and angle', () => {
    const shot = launch({x: 100,y:400},{angle:0,power:50,direction:1});
    expect(shot.vx).toBeCloseTo(160);
    expect(shot.vy).toBeCloseTo(0);
    expect(launch({x: 100,y:400},{angle:0,power:50,direction:-1}).vx).toBeLessThan(0);
  });
  it('moves projectile and calculates landing at floor', () => {
    const shot = launch({x: 50,y:400},{angle:45,power:50,direction:1});
    const t = impactAtGround(shot, 400);
    expect(t).not.toBeNull();
    expect(positionAt(shot, t!).y).toBeCloseTo(400);
    expect(positionAt(shot, .1).y).toBeLessThan(400);
  });
  it('clamps invalid power and prevents negative travel', () => {
    const a = launch({x:0,y:0},{angle:200,power:150,direction:1});
    expect(a.vx).toBeCloseTo(0, 8);
    expect(positionAt(a,-3)).toEqual({x:0,y:0});
  });
});

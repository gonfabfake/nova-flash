/** Deterministic local trajectory preview; no claim of server parity. */
export interface Vector { x: number; y: number }
export interface Projectile extends Vector { vx: number; vy: number }
export interface ShotConfig { angle: number; power: number; direction: -1 | 1; gravity?: number; speedFactor?: number }
export const DEFAULT_GRAVITY = 180;
export function launch(origin: Vector, config: ShotConfig): Projectile {
  const angle = Math.max(0, Math.min(90, config.angle)) * Math.PI / 180;
  const speed = Math.max(0, Math.min(100, config.power)) * (config.speedFactor ?? 3.2);
  return { ...origin, vx: Math.cos(angle) * speed * config.direction, vy: -Math.sin(angle) * speed };
}
export function positionAt(initial: Projectile, seconds: number, gravity = DEFAULT_GRAVITY): Vector {
  const t = Math.max(0, seconds);
  return { x: initial.x + initial.vx * t, y: initial.y + initial.vy * t + 0.5 * gravity * t * t };
}
export function impactAtGround(initial: Projectile, groundY: number, gravity = DEFAULT_GRAVITY): number | null {
  if (gravity <= 0 || !Number.isFinite(gravity)) return null;
  const delta = initial.y - groundY;
  const discriminant = initial.vy * initial.vy - 2 * gravity * delta;
  if (discriminant < 0) return null;
  const t = (-initial.vy + Math.sqrt(discriminant)) / gravity;
  return t >= 0 ? t : null;
}

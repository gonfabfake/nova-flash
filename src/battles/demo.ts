import { launch, positionAt, impactAtGround, type Projectile } from './physics';
const canvas = document.querySelector<HTMLCanvasElement>('#battle')!;
const ctx = canvas.getContext('2d')!;
const readout = document.querySelector<HTMLElement>('#readout')!;
const ground = 438;
let x = 120, angle = 45, direction: -1 | 1 = 1, power = 35, charging = false;
let chargeStart = 0;
let flight: { shot: Projectile; start: number; end: number } | null = null;
function update() {
  readout.textContent = 'Ângulo: ' + angle + '° | Força: ' + Math.round(power) +
    '% | Direção: ' + (direction > 0 ? 'direita' : 'esquerda') +
    (flight ? ' | Projétil em movimento' : '');
}
function charge() { if (!charging) { charging = true; chargeStart = performance.now(); } }
function fire() {
  if (!charging) return;
  charging = false;
  power = Math.min(100, Math.max(5, (performance.now() - chargeStart) / 22));
  const shot = launch({x, y: ground - 25}, {angle, power, direction});
  const duration = impactAtGround(shot, ground);
  flight = duration === null ? null : {shot, start: performance.now(), end: duration};
  update();
}
function move(delta: number) { x = Math.max(35, Math.min(965, x + delta)); direction = delta < 0 ? -1 : 1; update(); }
function changeAngle(delta: number) { angle = Math.max(0, Math.min(90, angle + delta)); update(); }
const bindHold = (id: string, onDown: () => void, onUp: () => void = () => {}) => {
  const element = document.getElementById(id)!;
  element.addEventListener('pointerdown', e => {e.preventDefault(); element.setPointerCapture(e.pointerId); onDown();});
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onUp);
};
bindHold('fire',charge,fire);
document.getElementById('angleDown')!.onclick = () => changeAngle(-2);
document.getElementById('angleUp')!.onclick = () => changeAngle(2);
document.getElementById('left')!.onclick = () => move(-12);
document.getElementById('right')!.onclick = () => move(12);
document.getElementById('reset')!.onclick = () => {flight=null;x=120;angle=45;power=35;direction=1;update();};
const held = new Set<string>();
window.addEventListener('keydown', e => {
  if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
  if (held.has(e.code)) return;
  held.add(e.code);
  if (['KeyW','ArrowUp'].includes(e.code)) changeAngle(2);
  if (['KeyS','ArrowDown'].includes(e.code)) changeAngle(-2);
  if (e.code === 'KeyA') move(-12);
  if (e.code === 'KeyD') move(12);
  if (e.code === 'Space') charge();
});
window.addEventListener('keyup', e => {held.delete(e.code);if (e.code === 'Space') fire();});
window.addEventListener('blur', () => {held.clear();if (charging) fire();});
function render(now: number) {
  ctx.clearRect(0,0,1000,540);
  const sky = ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,'#253d75');sky.addColorStop(1,'#7ab8d7');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1000,ground);
  ctx.fillStyle='#6a9d52';ctx.fillRect(0,ground,1000,102);
  ctx.fillStyle='#28313f';ctx.fillRect(0,ground+10,1000,10);
  ctx.fillStyle='#ffc95c';ctx.beginPath();ctx.arc(x,ground-24,17,0,Math.PI*2);ctx.fill();
  const radians = angle*Math.PI/180;
  const mx=x+direction*Math.cos(radians)*45, my=ground-25-Math.sin(radians)*45;
  ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,ground-25);ctx.lineTo(mx,my);ctx.stroke();
  if (charging) {power=Math.min(100,Math.max(5,(now-chargeStart)/22));update();}
  if (flight) {
    const elapsed=(now-flight.start)/1000;
    const t=Math.min(Math.max(0,elapsed),flight.end);
    for(let i=0;i<=24;i++){let p=positionAt(flight.shot,t*i/24);ctx.fillStyle='#ffffff70';ctx.fillRect(p.x,p.y,2,2);}
    const p=positionAt(flight.shot,t);
    ctx.fillStyle='#ffe57e';ctx.beginPath();ctx.arc(p.x,p.y,7,0,2*Math.PI);ctx.fill();
    if(elapsed>=flight.end){flight=null;update();}
  }
  requestAnimationFrame(render);
}
update();requestAnimationFrame(render);

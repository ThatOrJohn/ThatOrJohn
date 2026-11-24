const labels = {
  balloon: 'WEATHER BALLOON',
  comet: 'COMET PASS',
  launch: 'TEXAS LIFTOFF',
  satellite: 'SATELLITE DODGE',
  ufo: 'UNIDENTIFIED FLYING OBJECT',
  whale: 'WHALE SIGHTING',
};

export function ellipse(ctx, x, y, width, height, paint) {
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = paint;
  ctx.fill();
}

function satellite(ctx, phase, [x, y]) {
  ctx.translate(x + (0.5 - phase) * 153, y - 51);
  ctx.rotate(-0.22);
  ctx.fillStyle = '#70a6d5';
  ctx.fillRect(-18, -5, 13, 10);
  ctx.fillRect(5, -5, 13, 10);
  ctx.fillStyle = '#356489';
  ctx.fillRect(-17, -0.5, 11, 1);
  ctx.fillRect(6, -0.5, 11, 1);
  ctx.fillStyle = '#d5e1e9';
  ctx.fillRect(-6, -6, 12, 12);
  ellipse(ctx, 0, -7, 4, 1.5, '#f3eadc');
}

function comet(ctx, phase) {
  const x = 757 - phase * 105;
  const y = 39 + phase * 25;
  const tail = ctx.createLinearGradient(x, y, x + 75, y - 28);
  tail.addColorStop(0, '#d9faff');
  tail.addColorStop(0.24, '#7adcefcc');
  tail.addColorStop(1, '#7adcef00');
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 2);
  ctx.lineTo(x + 76, y - 28);
  ctx.lineTo(x + 2, y + 3);
  ctx.fillStyle = tail;
  ctx.fill();
  ellipse(ctx, x, y, 4, 3, '#ecffff');
}

function launch(ctx, travel, [x, y]) {
  const rise = 164 * Math.pow(travel, 1.35);
  ellipse(ctx, x, y + 1, 9, 2.7, '#d0d9df');
  ctx.translate(x, y - 14 - rise);
  ellipse(ctx, 0, 12, 3, 10 + Math.sin(travel * 105) * 3, '#ff9654');
  ellipse(ctx, 0, 9, 1.5, 6, '#fff2a6');
  ctx.fillStyle = '#f0e5d2';
  ctx.fillRect(-3, -6, 6, 14);
  ctx.beginPath();
  ctx.moveTo(-3, -6);
  ctx.lineTo(0, -13);
  ctx.lineTo(3, -6);
  ctx.fillStyle = '#ff865e';
  ctx.fill();
  ellipse(ctx, 0, -3, 1.5, 1.8, '#31546c');
}

function whale(ctx, [x, y], phase) {
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.beginPath();
  ctx.moveTo(-19, 1);
  ctx.bezierCurveTo(-12, -7, 1, -5, 10, 1);
  ctx.quadraticCurveTo(14, -4, 19, -4);
  ctx.quadraticCurveTo(20, 1, 15, 3);
  ctx.quadraticCurveTo(19, 7, 15, 11);
  ctx.quadraticCurveTo(10, 9, 10, 5);
  ctx.quadraticCurveTo(-6, 11, -19, 2);
  ctx.fillStyle = '#86becd';
  ctx.fill();
  ellipse(ctx, -13, 0, 1, 1, '#163d56');
  ctx.strokeStyle = '#d1f7ff';
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.moveTo(-10, -4);
  ctx.quadraticCurveTo(-10, -13 - phase * 3, -16, -14 - phase * 3);
  ctx.moveTo(-10, -4);
  ctx.quadraticCurveTo(-9, -14 - phase * 3, -4, -14 - phase * 3);
  ctx.stroke();
}

function balloon(ctx, phase, [x, y]) {
  const shift = (phase - 0.5) * 65;
  ctx.translate(x + 26 + shift, y - 35 - phase * 18);
  ellipse(ctx, 0, 0, 7, 9, '#ffe0a3');
  ctx.strokeStyle = '#ffd7a1';
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(1, 15);
  ctx.stroke();
  ctx.fillStyle = '#ffab82';
  ctx.fillRect(-2, 14, 6, 5);
}

function ufo(ctx, phase) {
  ctx.translate(704 - phase * 40, 61 - phase * 32);
  ctx.rotate(-0.2);
  ellipse(ctx, 0, -4, 8, 6, '#c4f0e0');
  ellipse(ctx, 0, 0, 16, 5, '#69bda7');
  for (const x of [-9, 0, 9]) ellipse(ctx, x, 0, 1.6, 1, '#fbf2a9');
}

function opacity({ type, phase, travel, whaleOpacity }) {
  if (!type) return 0;
  if (type === 'launch') return Math.max(0, Math.min(1, (0.47 - travel) * 9));
  if (type === 'whale') return whaleOpacity;
  return Math.max(0, Math.min(1, phase * 6, (1 - phase) * 6));
}

export function encounterLabel(scene) {
  return opacity(scene) > 0.53 ? labels[scene.type] : '';
}

export function drawEncounter(ctx, scene) {
  const alpha = opacity(scene);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const { type, phase, ground, travel, water } = scene;
  const draw = {
    balloon: () => balloon(ctx, phase, ground),
    comet: () => comet(ctx, phase),
    launch: () => launch(ctx, travel, scene.launch),
    satellite: () => satellite(ctx, phase, ground),
    ufo: () => ufo(ctx, phase),
    whale: () => whale(ctx, water, phase),
  };
  draw[type]();
  ctx.restore();
}

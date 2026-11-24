import { ellipse } from './encounters.mjs';

const labels = {
  penguin: 'PENGUIN LANDING JUDGE',
  rain: 'PERSONAL RAIN CLOUD',
  mirage: 'CHARGING STATION MIRAGE',
  dateline: 'DATE LINE MIX-UP',
  chairlift: 'CHAIRLIFT HITCHHIKE',
  tortoise: 'TORTOISE TRAFFIC JAM',
  geyser: 'GEYSER BOOST',
};

const cap = value => Math.min(1, Math.max(0, value));
const pulse = value => Math.sin(Math.PI * cap(value));

const poses = {
  penguin: phase => ({ y: -13 * Math.abs(Math.sin(phase * 4 * Math.PI)) * (1 - cap(phase * 2)) }),
  rain: phase => ({ tilt: -0.22 * pulse((phase - 0.5) / 0.43) }),
  mirage: phase => ({ x: 40 * pulse(phase), y: 7 * pulse(phase), tilt: 0.12 * pulse(phase) }),
  dateline: phase => ({ x: 22 * Math.cos(phase * 2 * Math.PI) * cap(phase * 9) * cap((1 - phase) * 9) }),
  chairlift: phase => ({ x: 69 * pulse(phase) * (phase * 2 - 0.8), y: -9 * pulse(phase) }),
  tortoise: phase => ({ y: -16 * pulse(phase) }),
  geyser: phase => ({ y: -24 * pulse((phase - 0.18) / 0.82) }),
};

export function scenePose(type, phase) {
  return { x: 0, y: 0, tilt: 0, ...poses[type]?.(phase) };
}

export function sceneLabel(type) {
  return labels[type] || '';
}

function shape(ctx, fill, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx, color, weight, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function penguin(ctx, phase) {
  ellipse(ctx, 53, 5, 14, 4, '#122c42');
  ellipse(ctx, 48, 2, 5, 2.4, '#ffae64');
  ellipse(ctx, 58, 2, 5, 2.4, '#ffae64');
  ellipse(ctx, 53, -12, 11, 15, '#263241');
  ellipse(ctx, 53, -12, 7, 11, '#f0efe4');
  ellipse(ctx, 53, -27, 11, 11, '#222a36');
  ellipse(ctx, 50, -28, 2.3, 2.2, '#f9f6eb');
  ellipse(ctx, 56, -28, 2.3, 2.2, '#f9f6eb');
  shape(ctx, '#ffae64', [[49, -23], [57, -23], [53, -19]]);
  const lift = cap((phase - 0.23) * 8);
  const signY = 1 - 17 * lift;
  line(ctx, '#263241', 4, [[59, -14], [68, signY - 3]]);
  ctx.fillStyle = '#fff1d7';
  ctx.fillRect(63, signY - 13, 29, 18);
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillStyle = '#172130';
  ctx.fillText('4/10', 65, signY, 25);
}

function rain(ctx, phase) {
  ctx.translate(31, -63);
  ellipse(ctx, -7, -2, 13, 7, '#a1b8d2');
  ellipse(ctx, 4, -8, 13, 10, '#bacde0');
  ellipse(ctx, 16, -1, 13, 7, '#91aeca');
  ellipse(ctx, 5, 1, 21, 6, '#acc0d7');
  for (let index = 0; index < 7; index++) {
    const y = 10 + (phase * 82 + index * 13) % 32;
    const x = (index % 4) * 9 - 12;
    line(ctx, '#8ad5fe', 1.6, [[x, y], [x - 3, y + 6]]);
  }

  if (phase < 0.18) return;
  ctx.translate(-12, 18);
  const flipped = phase > 0.57;
  ctx.rotate(flipped ? 0.43 : -0.16);
  line(ctx, '#ffdb98', 2.2, [[0, -6], [0, 16], [5, 18]]);
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.quadraticCurveTo(0, flipped ? 19 : -25, 18, 0);
  ctx.quadraticCurveTo(0, flipped ? 8 : -2, -18, 0);
  ctx.fillStyle = '#ff947b';
  ctx.fill();
}

function mirage(ctx, phase) {
  ctx.translate(57, -6);
  const flicker = 0.7 + 0.3 * Math.sin(phase * 66);
  ctx.globalAlpha = flicker * (1 - cap((phase - 0.55) * 4));
  ellipse(ctx, 0, 4, 26, 5, '#e3c4886b');
  ctx.fillStyle = '#81cdb2';
  ctx.fillRect(-12, -38, 24, 40);
  ctx.fillStyle = '#143f4a';
  ctx.fillRect(-8, -33, 16, 18);
  shape(ctx, '#f3ffd6', [[2, -31], [-4, -23], [0, -23], [-2, -17], [6, -26], [2, -26]]);
  line(ctx, '#9ddfcc', 2, [[11, -30], [18, -24], [18, -3], [11, -2]]);
  for (const y of [-34, -19, -9]) line(ctx, '#d1f1c4', 1, [[-20, y], [17, y]]);
}

function dateline(ctx, phase, pose) {
  const tomorrow = pose.x < 0;
  ctx.translate(45 + pose.x * 0.37, -46);
  ctx.rotate(0.08 * Math.sin(phase * Math.PI * 4));
  ctx.fillStyle = tomorrow ? '#ffe1a5' : '#b5e5db';
  ctx.fillRect(0, 0, 68, 20);
  ellipse(ctx, 0, 10, 2, 3, '#17354a');
  ellipse(ctx, 68, 10, 2, 3, '#17354a');
  ctx.font = 'bold 11px Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#182938';
  ctx.fillText(tomorrow ? 'TOMORROW' : 'TODAY', 34, 14);
}

function chairlift(ctx, phase, pose) {
  line(ctx, '#d7e8f0', 1.7, [[-51, -63], [70, -78]]);
  line(ctx, '#607b90', 2, [[70, -78], [70, 2]]);
  ctx.translate(pose.x, pose.y * 0.5);
  line(ctx, '#e6eef2', 2.4, [[2, -69], [2, -53], [22, -45], [22, -14], [-20, -14]]);
  line(ctx, '#ffb18a', 5, [[-20, -14], [22, -14]]);
  line(ctx, '#e6eef2', 1.8, [[-12, -13], [-12, -8], [16, -8]]);
}

function tortoise(ctx, phase) {
  const x = -39 + 84 * phase;
  ellipse(ctx, x, 9, 19, 3, '#152737');
  for (const foot of [-13, -6, 7, 14]) {
    ellipse(ctx, x + foot, 6 + Math.sin(phase * 13 + foot) * 1.8, 3.7, 3.3, '#aec080');
  }
  ellipse(ctx, x + 18, 1 + Math.sin(phase * 13), 6, 3.7, '#a8be87');
  ellipse(ctx, x + 20, 0, 1.0, 1.0, '#253a32');
  ellipse(ctx, x, 0, 16, 9, '#c09b67');
  ellipse(ctx, x, -1.8, 13.5, 7.4, '#6f8763');
  line(ctx, '#b4c795', 1.1, [[x - 9, 1], [x - 4, -5], [x + 4, -5], [x + 9, 1]]);
  line(ctx, '#b4c795', 1.1, [[x, -5], [x, 4]]);

  ctx.fillStyle = '#e2e5c0';
  ctx.fillRect(58, -55, 36, 13);
  ctx.fillRect(94, -51, 3, 5);
  ctx.fillStyle = '#293a47';
  ctx.fillRect(60, -53, 32, 9);
  ctx.fillStyle = phase < 0.5 ? '#aedf9a' : '#ff9d71';
  ctx.fillRect(61, -52, 29 * (1 - 0.8 * phase), 7);
}

function geyser(ctx, phase) {
  ellipse(ctx, 0, 2, 11, 4, '#58958f');
  ellipse(ctx, 0, 0, 7, 2.6, '#183b4b');
  const burst = pulse((phase - 0.18) / 0.82);
  const height = 7 + 47 * burst;
  const jet = ctx.createLinearGradient(0, 2, 0, -height);
  jet.addColorStop(0, '#64d6ee');
  jet.addColorStop(1, '#e7ffffd0');
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.bezierCurveTo(-12 * burst, -height * 0.7, -5 * burst, -height, 2, -height);
  ctx.bezierCurveTo(9 * burst, -height, 8 * burst, -height * 0.6, 4, 0);
  ctx.fillStyle = jet;
  ctx.fill();
  for (let index = 0; index < 7; index++) {
    const spread = (index - 3) * 6 * burst;
    const y = -height * (0.70 + (index % 3) * 0.1);
    ellipse(ctx, spread, y, 1.8 + burst, 1.6 + burst, '#c3f5ffb0');
  }
}

const drawings = { penguin, rain, mirage, dateline, chairlift, tortoise, geyser };

export function drawScene(ctx, type, phase, [x, y], pose) {
  if (!type) return;
  ctx.save();
  ctx.translate(x, y);
  drawings[type](ctx, phase, pose);
  ctx.restore();
}

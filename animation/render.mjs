import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { geoContains, geoDistance, geoGraticule, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import { itinerary } from './route.mjs';
import { drawEncounter, encounterLabel } from './encounters.mjs';

const [date, framesDirectory] = process.argv.slice(2);
if (!framesDirectory) throw new Error('Usage: node render.mjs YYYY-MM-DD path/to/new-frames-directory');
const { legs } = itinerary(date);
const root = new URL('./', import.meta.url);
const land = JSON.parse(await readFile(new URL('land.geojson', root), 'utf8'));
const bolt = await loadImage(await readFile(new URL('bolt.png', root)));
const width = 780;
const height = 238;
const fps = 14;
const centerX = 553;
const centerY = 119;
const radius = 97;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const projection = geoOrthographic().translate([centerX, centerY]).scale(radius).precision(0.55);
const path = geoPath(projection, ctx);
const graticule = geoGraticule().step([15, 15])();
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = p => p * p * (3 - 2 * p);

function circle(x, y, size, fill) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
}

function trace(geometry, stroke, weight = 1) {
  ctx.beginPath();
  path(geometry);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = weight;
  ctx.stroke();
}

function drawBackground() {
  const sky = ctx.createRadialGradient(centerX, centerY, 36, centerX, centerY, 456);
  sky.addColorStop(0, '#162d46');
  sky.addColorStop(1, '#0d1421');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  for (let star = 0; star < 100; star++) {
    const x = ((star * 233) % 991) * width / 991;
    const y = ((star * star * 127 + 57) % 983) * height / 983;
    circle(x, y, star % 17 === 0 ? 1.0 : 0.44, `rgba(189,220,255,${0.10 + (star % 7) * 0.06})`);
  }
}

function drawGlobe() {
  const halo = ctx.createRadialGradient(centerX, centerY, radius * 0.93, centerX, centerY, radius * 1.19);
  halo.addColorStop(0, '#3782b000');
  halo.addColorStop(0.34, '#3782b06b');
  halo.addColorStop(1, '#3782b000');
  circle(centerX, centerY, radius * 1.19, halo);

  const ocean = ctx.createLinearGradient(centerX - radius, 20, centerX + radius, 218);
  ocean.addColorStop(0, '#153e60');
  ocean.addColorStop(1, '#0b2038');
  circle(centerX, centerY, radius, ocean);
  trace(graticule, '#6897b04d', 0.5);

  const terrain = ctx.createLinearGradient(centerX - radius, 20, centerX + radius, 218);
  terrain.addColorStop(0, '#4a8575');
  terrain.addColorStop(1, '#20454b');
  ctx.beginPath();
  path(land);
  ctx.fillStyle = terrain;
  ctx.fill();
  ctx.strokeStyle = '#9dd4c48c';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  trace({ type: 'Sphere' }, '#9ad2f3aa', 1);
}

function drawCaption(leg, landed, label) {
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 49px Arial, "Liberation Sans", sans-serif';
  ctx.fillStyle = '#f5efe5';
  ctx.fillText('Bolt’s World Tour', 30, 84);
  ctx.fillStyle = '#ffaf70';
  ctx.fillRect(32, 108, 35, 2);

  ctx.font = '14px Menlo, "DejaVu Sans Mono", monospace';
  ctx.fillStyle = label ? '#a2ded0' : '#afbed0';
  const detail = label || (landed ? 'TOUCHDOWN' : `FROM ${leg.from.name.toUpperCase()}  →`);
  ctx.fillText(detail, 32, 140, 335);
  ctx.font = 'bold 34px Arial, "Liberation Sans", sans-serif';
  ctx.fillStyle = '#ffaf70';
  ctx.fillText(leg.to.name, 30, 178, 343);
  ctx.font = '16px Arial, "Liberation Sans", sans-serif';
  ctx.fillStyle = '#bfccde';
  ctx.fillText(leg.to.country, 32, 203, 334);
}

function drawBolt(point, time, landed, dodge) {
  const [x, y] = point;
  const size = 56;
  const wobble = Math.sin(time * 6);
  circle(x, y, 3, '#ffaf7099');
  ctx.save();
  ctx.translate(x - dodge * 8, y - (landed ? 4 : 12) + wobble * 1.8 + dodge * 15);
  ctx.rotate(wobble * 0.045 - dodge * 0.24);
  if (!landed) {
    for (let index = 0; index < 3; index++) {
      const age = (time * 2.7 + index / 3) % 1;
      circle(-17 - age * 8, -15 + age * 14, (1 - age) * 4, `rgba(255,157,80,${0.80 - age * 0.64})`);
    }
  }
  const spriteWidth = size * bolt.width / bolt.height;
  ctx.drawImage(bolt, -spriteWidth / 2, -size, spriteWidth, size);
  ctx.restore();
}

function nearbyWater(interpolate) {
  const offsets = [[9, -8], [12, 10], [-10, -8], [-10, 10], [0, 0]];
  for (const fraction of [0.49, 0.39, 0.58, 0.31, 0.68, 0.22, 0.77]) {
    const [longitude, latitude] = interpolate(fraction);
    for (const [east, north] of offsets) {
      const point = [((longitude + east + 540) % 360) - 180, latitude + north];
      if (Math.abs(point[1]) < 73 && !geoContains(land, point)) return point;
    }
  }
  return null;
}

function drawFrame(leg, frame, time) {
  const progress = Math.min(1, frame / leg.flightFrames);
  const landed = progress === 1;
  const overshoot = Math.min(0.11, 0.046 / leg.interpolate.distance);
  const position = progress < 0.86
    ? ease(progress / 0.86) * (1 + overshoot)
    : 1 + overshoot * (1 - ease((progress - 0.86) / 0.14));
  const point = leg.interpolate(position);
  const camera = leg.interpolate(ease(progress));
  const sway = 32 * Math.sin(2 * Math.PI * progress) * Math.sin(Math.PI * progress);
  const center = [camera[0] + 14 + sway, clamp(camera[1] - 13, -72, 72)];
  const visible = location => geoDistance(center, location) < Math.PI / 2;
  projection.rotate([-center[0], -center[1], 0]);

  const surface = projection(point);
  const eggProgress = (progress - 0.24) / 0.55;
  const whaleDistance = leg.water && visible(leg.water) ? geoDistance(point, leg.water) : Infinity;
  const whaleOpacity = progress > 0.1 && progress < 0.86 ? clamp((0.59 - whaleDistance) / 0.27, 0, 1) : 0;
  const encounter = {
    type: leg.egg, phase: eggProgress,
    ground: surface, launch: projection(leg.from.point), travel: progress,
    water: leg.water && projection(leg.water), whaleOpacity,
  };

  drawBackground();
  if (leg.egg === 'comet') drawEncounter(ctx, encounter);
  drawGlobe();
  ctx.setLineDash(landed ? [] : [2, 4]);
  trace(leg.route, '#ffb37de1', 1.3);
  ctx.setLineDash([]);
  if (visible(leg.to.point)) {
    const [x, y] = projection(leg.to.point);
    circle(x, y, 6, '#ffad7066');
    circle(x, y, 2.8, '#ffe8c6');
  }
  if (leg.egg !== 'comet') drawEncounter(ctx, encounter);

  const dodge = leg.egg === 'satellite' && eggProgress > 0 && eggProgress < 1
    ? Math.pow(Math.sin(Math.PI * eggProgress), 4) : 0;
  if (visible(point)) drawBolt(surface, time, landed, dodge);
  drawCaption(leg, landed, encounterLabel(encounter));
  ctx.strokeStyle = '#3d526d';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}

await mkdir(framesDirectory);
let frameNumber = 0;
for (const leg of legs) {
  leg.interpolate = geoInterpolate(leg.from.point, leg.to.point);
  leg.flightFrames = Math.round((1.6 + leg.interpolate.distance * 0.75) * fps);
  leg.route = { type: 'LineString', coordinates: Array.from({ length: 33 }, (_, i) => leg.interpolate(i / 32)) };
  leg.water = leg.egg === 'whale' ? nearbyWater(leg.interpolate) : null;
  for (let frame = 0; frame < leg.flightFrames + 9; frame++) {
    drawFrame(leg, frame, frameNumber / fps);
    const filename = `${String(frameNumber).padStart(4, '0')}.png`;
    await writeFile(join(framesDirectory, filename), canvas.toBuffer('image/png'));
    frameNumber++;
  }
}

console.log(`${date} ${legs.map(leg => `${leg.from.name} → ${leg.to.name} (${leg.egg})`).join(' · ')}`);

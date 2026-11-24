import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Natural Earth 5.1.2 public-domain populated places, scale rank 6 or better.
// Each row contains a city, country, longitude and latitude.
const places = JSON.parse(readFileSync(new URL('places.json', import.meta.url), 'utf8'));
const sectors = [[-180, -42], [-42, 44], [44, 100], [100, 181]];
const flybys = [
  ['satellite', 'comet', 'balloon'],
  ['balloon', 'ufo', 'comet'],
  ['satellite', 'ufo', 'balloon'],
  ['comet', 'balloon', 'satellite'],
  ['ufo', 'comet', 'satellite'],
];
const epoch = Date.UTC(2026, 10, 24);
const dayLength = 86_400_000;

function placeFromRow([name, country, longitude, latitude]) {
  return { name, country, point: [longitude, latitude] };
}

const pools = sectors.map(([west, east]) => places
  .filter(([, , longitude]) => longitude >= west && longitude < east)
  .map(row => ({ row, key: createHash('sha256').update(`Bolt’s World Tour ${JSON.stringify(row)}`).digest('hex') }))
  .sort((a, b) => a.key.localeCompare(b.key))
  .map(({ row }) => placeFromRow(row)));

export const destinationCount = places.length;
export const daysBeforeRepeat = Math.min(...pools.map(pool => pool.length));
export const texas = { name: 'Boca Chica', country: 'Texas, United States', point: [-97.156, 25.997] };

export function itinerary(date) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== date || timestamp < epoch) {
    throw new Error('Supply a date in YYYY-MM-DD format on or after 2026-11-24');
  }
  const day = (timestamp - epoch) / dayLength;
  const destinations = pools.map(pool => pool[day % pool.length]);
  const eggs = [...flybys[day % flybys.length], 'whale'];
  const stops = day % 7 === 0 ? [texas, ...destinations] : destinations;
  if (stops[0] === texas) eggs.unshift('launch');
  const legs = stops.map((from, index) => ({ from, to: stops[(index + 1) % stops.length], egg: eggs[index] }));
  return { destinations, legs };
}

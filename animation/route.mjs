import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { geoDistance } from 'd3-geo';

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
export const scenicStops = [
  { name: 'Patagonia', country: 'Punta Tombo, Argentina', point: [-65.17, -44.04], scene: 'penguin' },
  { name: 'London', country: 'United Kingdom', point: [-0.128, 51.507], scene: 'rain' },
  { name: 'Sahara', country: 'Algeria', point: [5.53, 24.0], scene: 'mirage' },
  { name: 'International Date Line', country: 'South Pacific Ocean', point: [180, -35], scene: 'dateline' },
  { name: 'Chamonix', country: 'French Alps', point: [6.87, 45.92], scene: 'chairlift' },
  { name: 'Galápagos', country: 'Santa Cruz Island, Ecuador', point: [-90.33, -0.73], scene: 'tortoise' },
  { name: 'Geysir', country: 'Iceland', point: [-20.30, 64.31], scene: 'geyser' },
];

function addScenicStop(stops, stop) {
  const nearby = stops.findIndex(place => geoDistance(place.point, stop.point) < 0.008);
  if (nearby >= 0) {
    const scenic = { ...stops[nearby], scene: stop.scene };
    return { stops: stops.with(nearby, scenic), scenic, index: -1 };
  }

  let best = { index: 0, extraDistance: Infinity };
  for (let index = 0; index < stops.length; index++) {
    const from = stops[index].point;
    const to = stops[(index + 1) % stops.length].point;
    const extraDistance = geoDistance(from, stop.point) + geoDistance(stop.point, to) - geoDistance(from, to);
    if (extraDistance < best.extraDistance) best = { index, extraDistance };
  }
  return { stops: stops.toSpliced(best.index + 1, 0, stop), scenic: stop, index: best.index };
}

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
  const route = addScenicStop(stops, scenicStops[day % scenicStops.length]);
  const { scenic } = route;
  if (route.index >= 0) {
    // Keep launches at their origin. Give a split ocean crossing's whale the longer leg.
    const index = route.index;
    if (eggs[index] === 'whale' &&
        geoDistance(route.stops[index].point, scenic.point) < geoDistance(scenic.point, stops[0].point)) {
      eggs.splice(index, 0, undefined);
    } else {
      eggs.splice(index + 1, 0, undefined);
    }
  }
  const legs = route.stops.map((from, index) => ({ from, to: route.stops[(index + 1) % route.stops.length], egg: eggs[index] }));
  return { destinations, legs, scenic };
}

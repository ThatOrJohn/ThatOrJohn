import assert from 'node:assert/strict';
import test from 'node:test';
import { daysBeforeRepeat, destinationCount, itinerary, scenicStops, texas } from './route.mjs';

test('routes span four longitude sectors without repeating a destination for over a year', () => {
  assert.ok(daysBeforeRepeat > 366);
  assert.ok(destinationCount >= daysBeforeRepeat * 4);
  const seen = new Set();
  for (let index = 0; index < daysBeforeRepeat; index++) {
    const date = new Date(Date.UTC(2026, 10, 24 + index)).toISOString().slice(0, 10);
    const { destinations, legs } = itinerary(date);
    assert.equal(destinations.length, 4);
    for (const destination of destinations) {
      assert.ok(!seen.has(destination), `Repeated ${destination.name} on ${date}`);
      assert.ok(legs.some(leg => leg.to.point === destination.point), `Route skipped ${destination.name} on ${date}`);
      seen.add(destination);
    }
    assert.equal(legs.at(-1).to, legs[0].from);
  }
});

test('Texas liftoff is a recurring cameo and all the other encounters can appear', () => {
  const eggs = new Set();
  for (let index = 0; index < 14; index++) {
    const date = new Date(Date.UTC(2026, 10, 24 + index)).toISOString().slice(0, 10);
    const { legs } = itinerary(date);
    assert.equal(legs[0].from === texas, index % 7 === 0);
    for (const leg of legs) if (leg.egg) eggs.add(leg.egg);
  }
  assert.deepEqual([...eggs].sort(), ['balloon', 'comet', 'launch', 'satellite', 'ufo', 'whale']);
  assert.throws(() => itinerary('2027-02-30'), /Supply a date/);
});

test('each scenic encounter is approached and departed once per weekly rotation', () => {
  for (let day = 0; day < scenicStops.length; day++) {
    const date = new Date(Date.UTC(2026, 10, 24 + day)).toISOString().slice(0, 10);
    const { legs, scenic } = itinerary(date);
    assert.equal(scenic.scene, scenicStops[day].scene);
    assert.equal(legs.filter(leg => leg.to === scenic).length, 1);
    assert.equal(legs.filter(leg => leg.from === scenic).length, 1);
    assert.equal(legs.filter(leg => leg.egg === 'whale').length, 1);
    for (const [index, leg] of legs.entries()) {
      assert.equal(leg.to, legs[(index + 1) % legs.length].from);
      if (leg.egg === 'launch') assert.equal(leg.from, texas);
    }
  }
});

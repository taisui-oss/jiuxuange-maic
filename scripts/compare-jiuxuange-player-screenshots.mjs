import process from 'node:process';
import sharp from 'sharp';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

const [baselinePath, candidatePath, cropText] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  fail(
    'Usage: node scripts/compare-jiuxuange-player-screenshots.mjs <baseline> <candidate> [left,top,width,height]',
  );
}

const crop = cropText
  ? (() => {
      const values = cropText.split(',').map(Number);
      if (values.length !== 4 || values.some((value) => !Number.isInteger(value) || value < 0)) {
        fail('Crop must be left,top,width,height with non-negative integers');
      }
      const [left, top, width, height] = values;
      if (width < 1 || height < 1) fail('Crop width and height must be positive');
      return { left, top, width, height };
    })()
  : null;

async function readRaw(path) {
  const pipeline = sharp(path).removeAlpha().toColourspace('srgb');
  const source = crop ? pipeline.extract(crop) : pipeline;
  return source.raw().toBuffer({ resolveWithObject: true });
}

const [baseline, candidate] = await Promise.all([
  readRaw(baselinePath),
  readRaw(candidatePath),
]);

if (
  baseline.info.width !== candidate.info.width ||
  baseline.info.height !== candidate.info.height ||
  baseline.info.channels !== candidate.info.channels
) {
  fail(
    `Image dimensions differ: baseline=${baseline.info.width}x${baseline.info.height}x${baseline.info.channels}, candidate=${candidate.info.width}x${candidate.info.height}x${candidate.info.channels}`,
  );
}

const pixelCount = baseline.info.width * baseline.info.height;
const channels = baseline.info.channels;
const channelTolerance = Number(process.env.PLAYER_VISUAL_CHANNEL_TOLERANCE ?? 12);
const maxChangedRatio = Number(process.env.PLAYER_VISUAL_MAX_CHANGED_RATIO ?? 0.01);
let changedPixels = 0;
let absoluteDelta = 0;
let maximumChannelDelta = 0;

for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  let changed = false;
  for (let channel = 0; channel < channels; channel += 1) {
    const offset = pixel * channels + channel;
    const delta = Math.abs(baseline.data[offset] - candidate.data[offset]);
    absoluteDelta += delta;
    maximumChannelDelta = Math.max(maximumChannelDelta, delta);
    if (delta > channelTolerance) changed = true;
  }
  if (changed) changedPixels += 1;
}

const result = {
  baseline: baselinePath,
  candidate: candidatePath,
  crop,
  width: baseline.info.width,
  height: baseline.info.height,
  changedPixels,
  changedPixelRatio: changedPixels / pixelCount,
  meanAbsoluteChannelDelta: absoluteDelta / (pixelCount * channels),
  maximumChannelDelta,
  channelTolerance,
  maxChangedRatio,
  passed: changedPixels / pixelCount <= maxChangedRatio,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exit(1);

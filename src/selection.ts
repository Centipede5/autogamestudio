export const EXPLORATION_PRESETS = [
  {
    label: "Focused (Recommended)",
    value: 1.25,
    description: "Mostly top Elo branches, with some exploration."
  },
  {
    label: "Balanced",
    value: 0.75,
    description: "Mixes top branches with mid-ranked candidates."
  },
  {
    label: "Exploratory",
    value: 0.35,
    description: "Frequently samples outside the top Elo branches."
  },
  {
    label: "Wide Search",
    value: 0.15,
    description: "Strongly explores the full ranked pool."
  }
] as const;

export const DEFAULT_EXPLORATION_LAMBDA = EXPLORATION_PRESETS[0].value;

export function selectRankedCandidate<T>(items: T[], lambda: number, randomValue = Math.random()) {
  if (items.length === 0) {
    throw new Error("Cannot select from an empty candidate list.");
  }

  const weights = items.map((_, index) => Math.exp(-lambda * index));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = Math.min(Math.max(randomValue, 0), 0.999999999999) * totalWeight;

  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index];
    if (threshold <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

export function selectUniformCandidate<T>(items: T[], randomValue = Math.random()) {
  if (items.length === 0) {
    throw new Error("Cannot select from an empty candidate list.");
  }

  const index = Math.min(items.length - 1, Math.floor(Math.min(Math.max(randomValue, 0), 0.999999999999) * items.length));
  return items[index];
}

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
];

/**
 * Returns a random user agent from a predefined list.
 * Helps avoid simplistic bot detection based on user agent.
 */
export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Halts execution for a given number of milliseconds.
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random integer between min and max (inclusive).
 * Useful for human-like delays.
 */
export function getRandomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculates a jittered delay based on a base value.
 * e.g., base of 2000 and percent 0.2 gives a value between 1600 and 2400.
 */
export function getJitter(base: number, percent: number = 0.2) {
  const min = base * (1 - percent);
  const max = base * (1 + percent);
  return getRandomDelay(Math.floor(min), Math.floor(max));
}

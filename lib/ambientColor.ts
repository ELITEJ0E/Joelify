// lib/ambientColor.ts
// Fast, lightweight color extraction and ambient gradient generation for album artwork

export interface AmbientColors {
  primary: string;
  secondary: string;
  glow: string;
  darkBackdrop: string;
}

const DEFAULT_AMBIENT: AmbientColors = {
  primary: "rgba(34, 197, 94, 0.35)",
  secondary: "rgba(16, 185, 129, 0.2)",
  glow: "rgba(34, 197, 94, 0.15)",
  darkBackdrop: "linear-gradient(180deg, rgba(10, 15, 12, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%)",
};

// Cache to prevent re-extracting for the same image URL
const colorCache = new Map<string, AmbientColors>();

/**
 * Deterministic hash-based ambient color fallback when canvas extraction fails or is CORS blocked
 */
export function getDeterministicAmbientColor(str: string): AmbientColors {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40) % 360;

  return {
    primary: `hsla(${h1}, 75%, 50%, 0.35)`,
    secondary: `hsla(${h2}, 80%, 45%, 0.25)`,
    glow: `hsla(${h1}, 80%, 55%, 0.2)`,
    darkBackdrop: `radial-gradient(ellipse at 50% 30%, hsla(${h1}, 60%, 15%, 0.6) 0%, rgba(5, 5, 8, 0.95) 80%)`,
  };
}

/**
 * Extract ambient colors from an image URL with canvas & fallback
 */
export function extractAmbientColors(imageUrl?: string | null, fallbackKey?: string): Promise<AmbientColors> {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(fallbackKey ? getDeterministicAmbientColor(fallbackKey) : DEFAULT_AMBIENT);
      return;
    }

    if (colorCache.has(imageUrl)) {
      resolve(colorCache.get(imageUrl)!);
      return;
    }

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          const fallback = getDeterministicAmbientColor(imageUrl);
          colorCache.set(imageUrl, fallback);
          resolve(fallback);
          return;
        }

        canvas.width = 10;
        canvas.height = 10;
        ctx.drawImage(img, 0, 0, 10, 10);

        const data = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          // Skip pure black/white to find vibrant midtones
          const brightness = (red + green + blue) / 3;
          if (brightness > 20 && brightness < 240) {
            r += red;
            g += green;
            b += blue;
            count++;
          }
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
        } else {
          r = 34; g = 197; b = 94;
        }

        const colors: AmbientColors = {
          primary: `rgba(${r}, ${g}, ${b}, 0.35)`,
          secondary: `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 20)}, ${Math.min(255, b + 40)}, 0.25)`,
          glow: `rgba(${r}, ${g}, ${b}, 0.2)`,
          darkBackdrop: `radial-gradient(ellipse at 50% 25%, rgba(${r}, ${g}, ${b}, 0.25) 0%, rgba(8, 8, 12, 0.95) 75%)`,
        };

        colorCache.set(imageUrl, colors);
        resolve(colors);
      } catch {
        const fallback = getDeterministicAmbientColor(imageUrl);
        colorCache.set(imageUrl, fallback);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      const fallback = getDeterministicAmbientColor(fallbackKey || imageUrl);
      colorCache.set(imageUrl, fallback);
      resolve(fallback);
    };
  });
}

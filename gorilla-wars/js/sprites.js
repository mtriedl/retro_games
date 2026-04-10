const SPRITE_PATHS = [
  'assets/images/gorilla-normal.png',
  'assets/images/gorilla-throw-p2.png',
  'assets/images/gorilla-throw-p1.png',
  'assets/images/gorilla-victory.png',
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function createGorillaSprites() {
  return Promise.all(SPRITE_PATHS.map(loadImage));
}

export async function loadProjectileSprite(name) {
  if (name === 'Banana') return null;
  const src = `assets/images/projectile-${name.toLowerCase()}.png`;
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load projectile sprite: ${src}, falling back to default`);
      resolve(null);
    };
    img.src = src;
  });
}

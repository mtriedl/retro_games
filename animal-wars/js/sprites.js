function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function characterPaths(name) {
  const base = `assets/images/${name.toLowerCase()}`;
  return [
    `${base}-normal.png`,
    `${base}-throw-p2.png`,
    `${base}-throw-p1.png`,
    `${base}-victory.png`,
  ];
}

export async function createCharacterSprites(characterName = 'Gorilla') {
  const paths = characterPaths(characterName);
  try {
    return await Promise.all(paths.map(loadImage));
  } catch {
    if (characterName !== 'Gorilla') {
      console.warn(`Failed to load ${characterName} sprites, falling back to Gorilla`);
      return Promise.all(characterPaths('Gorilla').map(loadImage));
    }
    throw new Error('Failed to load Gorilla sprites');
  }
}

export async function loadCharacterPreview(characterName = 'Gorilla') {
  const src = `assets/images/${characterName.toLowerCase()}-normal.png`;
  try {
    return await loadImage(src);
  } catch {
    console.warn(`Failed to load ${characterName} preview`);
    return null;
  }
}

export async function loadProjectileSprite(name) {
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

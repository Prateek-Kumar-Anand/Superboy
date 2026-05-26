const gameData = {
  characters: {
    naveen: { name: "Naveen", color: "#3fe2ff" },
    radhika: { name: "Radhika", color: "#ff74c6" }
  },
  backgrounds: ["Summer", "Winter", "Autumn", "Iceland", "Volcano"],
  guns: [
    "Assault Carbine", "Burst Pistol", "Rail SMG", "Plasma Rifle", "Arc Shotgun",
    "Bolt Sniper", "Pulse LMG", "Smart Grenade Launcher", "Twin Uzi", "Magnum Revolver",
    "Freeze Cannon", "Incendiary Blaster", "Ion Beamer", "Micro Rocket", "Gauss Rifle",
    "Repeater Crossbow", "Tesla Gun", "Scatter Cannon", "Laser Carbine", "Needler",
    "Drill Launcher", "Shock SMG", "Tri-Barrel Shotgun", "Mini Mortar", "Bio Foam Sprayer",
    "Photon Rifle", "Homing Dart Gun", "Chain Lightning Rifle", "Flare Launcher", "Cryo SMG",
    "Heavy Minigun", "Hand Cannon", "Burst Railgun", "Sticky Bomb Gun", "Orbital Designator"
  ],
  armoredVehicles: ["Iron Rhino Tank", "Sky Viper Hovercraft", "Atlas Walker", "Magma Breaker APC"],
  powerUps: [
    "Soda", "Apple", "Med Kit", "Ammo Crate", "Armor Plate",
    "Speed Boots", "Damage Chip", "Shield Core", "Rage Capsule"
  ],
  villains: [
    "General Obsidian", "Dr. Frostbyte", "Warlord Emberclaw", "Titan Helix", "Queen Vortex"
  ]
};

const state = {
  selectedCharacter: null,
  stageIndex: 0,
  villainIndex: 0
};

const themeColors = {
  Summer: ["#f7d24c", "#80d66d", "#2aa9ff"],
  Winter: ["#d9f0ff", "#8ec4ff", "#4b6fff"],
  Autumn: ["#ffb347", "#dc6b3f", "#834224"],
  Iceland: ["#cdf3ff", "#85e1ff", "#4f9ddd"],
  Volcano: ["#ff7a18", "#d00000", "#370617"]
};

function bootstrap() {
  renderStaticLists();
  bindEvents();
  drawStage();
}

function renderStaticLists() {
  fillList("guns-list", gameData.guns);
  fillList("vehicles-list", gameData.armoredVehicles);
  fillList("powerups-list", gameData.powerUps);
  fillList("villains-list", gameData.villains);
  fillList("themes-list", gameData.backgrounds);
}

function fillList(id, items) {
  const container = document.getElementById(id);
  container.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  }
}

function bindEvents() {
  document.querySelectorAll(".character-card").forEach(button => {
    button.addEventListener("click", () => lockCharacter(button.dataset.character));
  });

  document.getElementById("next-stage").addEventListener("click", () => {
    if (!state.selectedCharacter) return;
    state.stageIndex = (state.stageIndex + 1) % gameData.backgrounds.length;
    state.villainIndex = (state.villainIndex + 1) % gameData.villains.length;
    drawStage();
  });

  document.getElementById("restart-run").addEventListener("click", restartRun);
}

function lockCharacter(characterKey) {
  if (state.selectedCharacter) return;
  state.selectedCharacter = characterKey;
  document.getElementById("character-select").classList.add("hidden");
  document.getElementById("game-ui").classList.remove("hidden");
  document.getElementById("selected-character").textContent =
    `Locked Operative: ${gameData.characters[characterKey].name}`;
  drawStage();
}

function restartRun() {
  state.selectedCharacter = null;
  state.stageIndex = 0;
  state.villainIndex = 0;
  document.getElementById("character-select").classList.remove("hidden");
  document.getElementById("game-ui").classList.add("hidden");
  drawStage();
}

function drawStage() {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const bg = gameData.backgrounds[state.stageIndex];
  const villain = gameData.villains[state.villainIndex];

  document.getElementById("current-bg-label").textContent = `Theme: ${bg}`;
  document.getElementById("villain-label").textContent = `Villain: ${villain}`;

  const [sky, mid, ground] = themeColors[bg];
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = i % 2 === 0 ? mid : ground;
    const h = 40 + (i % 5) * 20;
    ctx.fillRect(i * 40, canvas.height - 220 - h, 36, h);
  }

  ctx.fillStyle = ground;
  ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

  const character = gameData.characters[state.selectedCharacter];
  if (character) {
    ctx.fillStyle = character.color;
    ctx.fillRect(140, canvas.height - 220, 42, 70);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(146, canvas.height - 234, 30, 18);
  }

  ctx.fillStyle = "#111";
  ctx.fillRect(canvas.width - 220, canvas.height - 260, 72, 120);
  ctx.fillStyle = "#ff4040";
  ctx.fillRect(canvas.width - 210, canvas.height - 250, 52, 25);

  ctx.fillStyle = "#fff";
  ctx.font = "18px monospace";
  ctx.fillText(bg.toUpperCase(), 20, 32);
  ctx.fillText(villain.toUpperCase(), 20, 56);
}

bootstrap();

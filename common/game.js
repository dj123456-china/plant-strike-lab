import { getPlant, createPlant, stepPlant, getShotStats, applyHit, explodePlant } from './plants.js';
export const DEFAULT_EFFECT = { type: 'pea', color: '#d7ff3f', size: 18, speed: 3, damage: 25, interval: 12, trail: true, glow: true };
export function createGameState() {
  return { running: false, ended: false, won: false, showIntro: true, sun: 200, killed: 0, spawned: 0, total: 10,
    plants: [], zombies: [], projectiles: [], particles: [], suns: [], mowers: Array(5).fill(true),
    spawnClock: 0, sunClock: 0, nextId: 1, selectedTool: 'plant', selectedPlantType: 'pea', message: '准备完毕，先放置几株植物' };
}
export function createGameController(game, { effect, assets, notify = () => {}, sound = () => {} }) {
  const showToast = notify;
  const beep = sound;
  const setMessage = (message) => { game.message = message; };
  function resetGame() {
    const selection = { selectedTool: game.selectedTool, selectedPlantType: game.selectedPlantType };
    Object.assign(game, createGameState(), selection);
  }
  function toggleGame() {
    if (game.ended) { resetGame(); return; }
    game.running = !game.running;
    game.showIntro = false;
    setMessage(game.running ? '防线启动，僵尸正在接近' : '游戏已暂停');
    beep();
  }
  function endGame(won) {
    game.running = false; game.ended = true; game.won = won;
    setMessage(won ? '本轮胜利，特效配置已保存' : '僵尸突破了防线');
    beep();
  }
function placeOrRemove(row, col) {
  if (game.ended) return;
  const existing = game.plants.find((plant) => plant.row === row && plant.col === col);
  if (game.selectedTool === "shovel") {
    if (!existing) {
      showToast("这个格子里没有植物", true);
      return;
    }
    game.plants = game.plants.filter((plant) => plant.id !== existing.id);
    const refund = Math.floor(getPlant(existing.type).cost * 0.3);
    game.sun += refund;
    
    setMessage(`植物已铲除，返还 ${refund} 阳光`);
    beep(230, 0.06);
    return;
  }
  if (existing) {
    showToast("这个格子已经有植物", true);
    return;
  }
  const spec = getPlant(game.selectedPlantType);
  if (game.sun < spec.cost) {
    showToast(`阳光不足，${spec.name}需要 ${spec.cost} 阳光`, true);
    setMessage("等待阳光，或点击草坪上的阳光球");
    beep(150, 0.08);
    return;
  }
  game.sun -= spec.cost;
  game.plants.push(createPlant(spec.id, row, col, game.nextId++));
  game.showIntro = false;
  
  setMessage(`已在第 ${row + 1} 行种下${spec.name}`);
  beep(520, 0.05);
}

function spawnZombie() {
  const row = Math.floor(Math.random() * 5);
  const baseHp = game.spawned > 6 ? 135 : 105;
  game.zombies.push({
    id: game.nextId++, row, x: 9.1, hp: baseHp, maxHp: baseHp,
    speed: 0.155 + Math.random() * 0.035, attackClock: 0, hit: 0, slow: 0,
  });
  game.spawned += 1;
  setMessage(`第 ${row + 1} 行发现僵尸`);
}

function spawnSun() {
  game.suns.push({
    id: game.nextId++, row: Math.floor(Math.random() * 5), col: 1 + Math.floor(Math.random() * 7), ttl: 12,
  });
  
}

function fire(plant) {
  plant.pulse = 0.28;
  const shotStats = getShotStats(plant, effect);
  game.projectiles.push({
    id: game.nextId++, row: plant.row, x: plant.col + 0.54,
    speed: 1.25 + effect.speed * 0.64,
    damage: shotStats.damage,
    slow: shotStats.slow,
    type: effect.type,
    color: effect.color,
    size: effect.size,
    trail: effect.trail,
    glow: effect.glow,
    image: assets.projectile,
  });
  if (game.projectiles.length > 45) game.projectiles.shift();
  beep(effect.type === "bolt" ? 760 : 480, 0.025, 0.012);
}

function hitZombie(projectile, zombie) {
  applyHit(projectile, zombie);
  game.particles.push({
    id: game.nextId++, row: zombie.row, x: zombie.x, ttl: 0.42,
    color: projectile.color, size: projectile.size, glow: projectile.glow,
  });
  if (game.particles.length > 24) game.particles.shift();
  beep(projectile.type === "fire" ? 260 : 340, 0.035, 0.016);
}

function triggerMower(row) {
  game.mowers[row] = false;
  const victims = game.zombies.filter((zombie) => zombie.row === row);
  game.killed += victims.length;
  // The current frame still iterates the old array; invalidate cleared actors there too.
  victims.forEach((zombie) => { zombie.hp = 0; });
  game.zombies = game.zombies.filter((zombie) => zombie.row !== row);
  
  setMessage(`第 ${row + 1} 行割草机已启动`);
  showToast("割草机清除了这一行的僵尸");
  beep(120, 0.18, 0.06);
}

function updateGame(dt) {
  if (!game.running || game.ended) return;

  game.spawnClock += dt;
  game.sunClock += dt;
  const spawnGap = Math.max(1.7, 3.3 - game.spawned * 0.08);
  if (game.spawned < game.total && (game.spawned === 0 ? game.spawnClock > 1.1 : game.spawnClock > spawnGap)) {
    game.spawnClock = 0;
    spawnZombie();
  }
  if (game.sunClock > 5.2) {
    game.sunClock = 0;
    game.sun += 25;
    spawnSun();
    
  }

  for (const plant of game.plants) {
    const action = stepPlant(plant, game.zombies, dt, effect.interval);
    if (action === "shoot") {
      fire(plant);
    } else if (action === "sun") {
      game.sun += 25;
      game.particles.push({ id: game.nextId++, kind: "sun", row: plant.row, x: plant.col, ttl: 0.8, color: "#ffdf65", size: 22, glow: true });
      setMessage("向日葵产出 25 阳光，已自动收集");
      
    } else if (action === "explode") {
      const hits = explodePlant(plant, game.zombies);
      game.particles.push({ id: game.nextId++, kind: "blast", row: plant.row, x: plant.col, ttl: 0.65, color: "#ffb64d", size: 30, glow: effect.glow });
      setMessage(`樱桃炸弹爆炸，命中 ${hits} 只僵尸`);
      beep(95, 0.2, 0.06);
    }
  }
  game.plants = game.plants.filter((plant) => !plant.consumed);
  if (game.particles.length > 30) game.particles = game.particles.slice(-30);

  for (const zombie of game.zombies) {
    if (zombie.hp <= 0) continue;
    zombie.hit = Math.max(0, zombie.hit - dt);
    const speedFactor = zombie.slow > 0 ? 0.5 : 1;
    zombie.slow = Math.max(0, (zombie.slow || 0) - dt);
    const blocker = game.plants
      .filter((plant) => plant.hp > 0 && plant.row === zombie.row && zombie.x <= plant.col + 0.68 && zombie.x > plant.col - 0.2)
      .sort((a, b) => b.col - a.col)[0];
    if (blocker) {
      zombie.attackClock += dt * speedFactor;
      if (zombie.attackClock > 0.75) {
        zombie.attackClock = 0;
        blocker.hp -= 14;
        beep(175, 0.035, 0.014);
      }
    } else {
      zombie.attackClock = 0;
      zombie.x -= zombie.speed * dt * speedFactor;
    }
    if (zombie.x < -0.12) {
      if (game.mowers[zombie.row]) triggerMower(zombie.row);
      else { endGame(false); return; }
    }
  }

  const deadPlants = game.plants.filter((plant) => plant.hp <= 0);
  if (deadPlants.length) {
    game.plants = game.plants.filter((plant) => plant.hp > 0);
    setMessage("一株植物被僵尸吃掉了");
  }

  for (const projectile of game.projectiles) {
    projectile.x += projectile.speed * dt;
    const target = game.zombies
      .filter((zombie) => zombie.hp > 0 && zombie.row === projectile.row && Math.abs(zombie.x - projectile.x) < 0.26)
      .sort((a, b) => a.x - b.x)[0];
    if (target) {
      projectile.dead = true;
      hitZombie(projectile, target);
    }
    if (projectile.x > 9.6) projectile.dead = true;
  }
  game.projectiles = game.projectiles.filter((projectile) => !projectile.dead);

  const deadZombies = game.zombies.filter((zombie) => zombie.hp <= 0);
  if (deadZombies.length) {
    game.killed += deadZombies.length;
    game.sun += deadZombies.length * 10;
    game.zombies = game.zombies.filter((zombie) => zombie.hp > 0);
    setMessage(`击倒僵尸，获得 ${deadZombies.length * 10} 阳光`);
    
  }

  game.particles.forEach((particle) => { particle.ttl -= dt; });
  game.particles = game.particles.filter((particle) => particle.ttl > 0);
  
  game.suns.forEach((sun) => { sun.ttl -= dt; });
  game.suns = game.suns.filter((sun) => sun.ttl > 0);
  

  if (game.spawned >= game.total && game.zombies.length === 0 && !game.ended) endGame(true);
}

function collectSun(id) {
  const sun = game.suns.find((item) => item.id === id);
  if (!sun) return;
  game.suns = game.suns.filter((item) => item.id !== id);
  
  game.sun += 25;
  
  setMessage("收集到 25 阳光");
  beep(680, 0.06, 0.025);
}
return { resetGame, toggleGame, placeOrRemove, collectSun, updateGame };
}

export const PLANTS = [
  { id: "pea", name: "豆荚射手", role: "基础远程", cost: 50, hp: 100, assetKey: "plant", image: "/static/default-plant.png", description: "向本行僵尸发射弹体，伤害和特效可在攻击工坊调整。", shooter: true },
  { id: "sunflower", name: "向日葵", role: "生产阳光", cost: 50, hp: 80, assetKey: "sunflower", image: "/static/plant-sunflower.png", description: "开战 4 秒后首次产出，之后每 8 秒自动增加 25 阳光。", shooter: false },
  { id: "repeater", name: "双发射手", role: "双发连射", cost: 125, hp: 120, assetKey: "repeater", image: "/static/plant-repeater.png", description: "每轮连续发射两枚弹体，共用攻击工坊的伤害和特效。", shooter: true },
  { id: "ice", name: "寒冰射手", role: "寒冰减速", cost: 100, hp: 100, assetKey: "ice", image: "/static/plant-ice.png", description: "命中后使僵尸移速和啃咬速度减半，持续 3 秒；伤害为设定值的 80%。", shooter: true },
  { id: "walnut", name: "坚果墙", role: "坚实防御", cost: 75, hp: 600, assetKey: "walnut", image: "/static/plant-walnut.png", description: "拥有 600 生命值，不发射弹体。种在前排保护后方射手。", shooter: false },
  { id: "cherry", name: "樱桃炸弹", role: "范围爆破", cost: 150, hp: 100, assetKey: "cherry", image: "/static/plant-cherry.png", description: "开战后引信倒数 1.2 秒，对周围 3×3 格造成 999 伤害，使用后消失。", shooter: false },
];

export function getPlant(type) {
  return PLANTS.find((plant) => plant.id === type) || PLANTS[0];
}

export function createPlant(type, row, col, id) {
  const spec = getPlant(type);
  return {
    id, type: spec.id, row, col, hp: spec.hp, maxHp: spec.hp,
    cooldown: spec.id === "sunflower" ? 4 : spec.id === "cherry" ? 1.2 : 0.3,
    pulse: 0, burstWait: 0, burstPending: false, consumed: false,
  };
}

// Only called while the battle is running; all timers use game time, not wall time.
export function stepPlant(plant, zombies, dt, interval) {
  if (plant.hp <= 0 || plant.consumed) return null;
  plant.pulse = Math.max(0, plant.pulse - dt);
  const spec = getPlant(plant.type);
  if (spec.id === "walnut") return null;
  plant.cooldown -= dt;
  if (spec.id === "sunflower") {
    if (plant.cooldown > 0) return null;
    plant.cooldown = 8;
    plant.pulse = 0.28;
    return "sun";
  }
  if (spec.id === "cherry") {
    if (plant.cooldown > 0) return null;
    plant.consumed = true;
    return "explode";
  }
  const hasTarget = zombies.some((zombie) => zombie.hp > 0 && zombie.row === plant.row && zombie.x > plant.col + 0.2);
  if (plant.burstPending) {
    plant.burstWait -= dt;
    if (plant.burstWait <= 0) {
      plant.burstPending = false;
      if (hasTarget) return "shoot";
    }
  }
  if (!hasTarget || plant.cooldown > 0) return null;
  plant.cooldown = interval / 10;
  if (spec.id === "repeater") {
    plant.burstPending = true;
    plant.burstWait = 0.16;
  }
  return "shoot";
}

export function getShotStats(plant, effect) {
  return {
    damage: plant.type === "ice" ? Math.round(effect.damage * 0.8) : effect.damage,
    slow: plant.type === "ice" ? 3 : 0,
  };
}

export function applyHit(projectile, zombie) {
  zombie.hp -= projectile.damage;
  zombie.hit = 0.12;
  if (projectile.slow) zombie.slow = Math.max(zombie.slow || 0, projectile.slow);
}

export function explodePlant(plant, zombies) {
  let hits = 0;
  zombies.forEach((zombie) => {
    if (zombie.hp > 0 && Math.abs(zombie.row - plant.row) <= 1 && Math.abs(zombie.x - plant.col) <= 1.5) {
      zombie.hp -= 999;
      hits += 1;
    }
  });
  return hits;
}

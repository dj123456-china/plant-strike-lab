import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLANTS,
  applyHit,
  createPlant,
  explodePlant,
  getPlant,
  getShotStats,
  stepPlant,
} from "../common/plants.js";

const DEFAULT_INTERVAL = 12;
const target = (overrides = {}) => ({ row: 2, x: 6, hp: 200, ...overrides });
const plantAt = (type, overrides = {}) => ({
  ...createPlant(type, 2, 3, 1),
  ...overrides,
});

describe("植物属性", () => {
  const expected = [
    ["pea", 50, 100],
    ["sunflower", 50, 80],
    ["repeater", 125, 120],
    ["ice", 100, 100],
    ["walnut", 75, 600],
    ["cherry", 150, 100],
  ];

  it("恰好提供 6 类植物，且类型 ID 唯一", () => {
    assert.deepEqual(PLANTS.map(({ id }) => id).sort(), expected.map(([id]) => id).sort());
    assert.equal(new Set(PLANTS.map(({ id }) => id)).size, 6);
  });

  for (const [type, cost, hp] of expected) {
    it(`${type} 的费用为 ${cost}，初始与最大生命值为 ${hp}`, () => {
      assert.equal(getPlant(type).cost, cost);
      assert.equal(getPlant(type).hp, hp);
      const plant = createPlant(type, 1, 4, 42);
      assert.equal(plant.hp, hp);
      assert.equal(plant.maxHp, hp);
      assert.equal(plant.type, type);
      assert.equal(plant.id, 42);
      assert.equal(plant.row, 1);
      assert.equal(plant.col, 4);
    });
  }
});

describe("向日葵", () => {
  it("无僵尸时也会在首次 4 秒、随后每 8 秒产出阳光", () => {
    const plant = plantAt("sunflower");
    assert.equal(stepPlant(plant, [], 3, DEFAULT_INTERVAL), null);
    assert.equal(stepPlant(plant, [], 1, DEFAULT_INTERVAL), "sun");
    for (let cycle = 0; cycle < 3; cycle += 1) {
      assert.equal(stepPlant(plant, [], 7, DEFAULT_INTERVAL), null);
      assert.equal(stepPlant(plant, [], 1, DEFAULT_INTERVAL), "sun");
      assert.equal(stepPlant(plant, [], 0, DEFAULT_INTERVAL), null);
    }
  });
});

describe("双发射手", () => {
  it("一轮恰好发射两次，第二发延迟 0.16 秒且不重置整轮冷却", () => {
    const plant = plantAt("repeater");
    const zombies = [target()];
    assert.equal(stepPlant(plant, zombies, 0.3, DEFAULT_INTERVAL), "shoot");
    assert.equal(stepPlant(plant, zombies, 0.08, DEFAULT_INTERVAL), null);
    assert.equal(stepPlant(plant, zombies, 0.08, DEFAULT_INTERVAL), "shoot");
    assert.equal(stepPlant(plant, zombies, 0, DEFAULT_INTERVAL), null);
    assert.equal(plant.burstPending, false);
    assert.ok(Math.abs(plant.cooldown - 1.04) < 1e-10);
  });

  it("没有同一行、存活且位于前方的目标时不发射", () => {
    const invalidTargets = [
      [],
      [target({ row: 1 })],
      [target({ hp: 0 })],
      [target({ hp: -1 })],
      [target({ x: 3 })],
      [target({ x: 3.2 })],
    ];
    for (const zombies of invalidTargets) {
      const plant = plantAt("repeater");
      assert.equal(stepPlant(plant, zombies, 10, DEFAULT_INTERVAL), null);
      assert.equal(plant.burstPending, false);
    }
  });

  it("首发后目标消失时取消第二发，目标返回后等待下一轮", () => {
    const plant = plantAt("repeater");
    assert.equal(stepPlant(plant, [target()], 0.3, DEFAULT_INTERVAL), "shoot");
    assert.equal(stepPlant(plant, [], 0.16, DEFAULT_INTERVAL), null);
    assert.equal(plant.burstPending, false);
    assert.equal(stepPlant(plant, [target()], 0, DEFAULT_INTERVAL), null);
    assert.equal(stepPlant(plant, [target()], plant.cooldown, DEFAULT_INTERVAL), "shoot");
  });
});

describe("寒冰射手", () => {
  it("伤害为特效设定值的 80%，命中后施加 3 秒减速", () => {
    for (const [damage, expectedDamage] of [[10, 8], [25, 20], [60, 48]]) {
      const shot = getShotStats(plantAt("ice"), { damage });
      assert.deepEqual(shot, { damage: expectedDamage, slow: 3 });
      const zombie = target();
      applyHit(shot, zombie);
      assert.equal(zombie.hp, 200 - expectedDamage);
      assert.equal(zombie.slow, 3);
      assert.ok(zombie.hit > 0);
    }
  });

  it("再次命中刷新减速，普通弹体不会清除已有减速", () => {
    const zombie = target({ slow: 1 });
    applyHit(getShotStats(plantAt("ice"), { damage: 25 }), zombie);
    assert.equal(zombie.slow, 3);
    applyHit(getShotStats(plantAt("pea"), { damage: 25 }), zombie);
    assert.equal(zombie.slow, 3);
    assert.equal(zombie.hp, 155);
  });

  it("普通射手与双发射手保留完整设定伤害且不施加减速", () => {
    for (const type of ["pea", "repeater"]) {
      assert.deepEqual(getShotStats(plantAt(type), { damage: 25 }), { damage: 25, slow: 0 });
    }
  });
});

describe("坚果墙", () => {
  it("面对僵尸并经过多个攻击周期也不攻击", () => {
    const plant = plantAt("walnut");
    for (let cycle = 0; cycle < 5; cycle += 1) {
      assert.equal(stepPlant(plant, [target()], 60, 6), null);
    }
    assert.equal(plant.hp, 600);
    assert.equal(plant.burstPending, false);
  });
});

describe("樱桃炸弹", () => {
  it("无目标时也在 1.2 秒触发爆炸，并且只触发一次", () => {
    const plant = plantAt("cherry");
    assert.equal(stepPlant(plant, [], 0.6, DEFAULT_INTERVAL), null);
    assert.equal(stepPlant(plant, [], 0.6, DEFAULT_INTERVAL), "explode");
    assert.equal(plant.consumed, true);
    assert.equal(stepPlant(plant, [target()], 0, DEFAULT_INTERVAL), null);
    assert.equal(stepPlant(plant, [target()], 10, DEFAULT_INTERVAL), null);
  });

  it("对周围 3×3 格内每个活着的僵尸造成 999 伤害", () => {
    const plant = plantAt("cherry");
    const zombies = [];
    for (const row of [1, 2, 3]) {
      for (const x of [2, 3, 4]) zombies.push(target({ row, x, hp: 1200 }));
    }
    assert.equal(explodePlant(plant, zombies), 9);
    assert.ok(zombies.every(({ hp }) => hp === 201));
  });

  it("包含相邻格外沿，但不影响范围外或已经死亡的僵尸", () => {
    const plant = plantAt("cherry");
    const boundary = [target({ row: 1, x: 1.5 }), target({ row: 3, x: 4.5 })];
    const excluded = [
      target({ row: 0, x: 3 }),
      target({ row: 4, x: 3 }),
      target({ x: 1.4999 }),
      target({ x: 4.5001 }),
      target({ x: 3, hp: 0 }),
      target({ x: 3, hp: -5 }),
    ];
    const before = excluded.map((zombie) => ({ ...zombie }));
    assert.equal(explodePlant(plant, [...boundary, ...excluded]), 2);
    assert.ok(boundary.every(({ hp }) => hp === -799));
    assert.deepEqual(excluded, before);
  });
});

describe("死亡植物", () => {
  for (const { id: type } of PLANTS) {
    it(`${type} 死亡后不射击、不生产、不爆炸且不推进计时`, () => {
      for (const hp of [0, -1]) {
        const plant = plantAt(type, { hp, cooldown: 0, pulse: 0.1, burstPending: true, burstWait: 0 });
        const before = { ...plant };
        assert.equal(stepPlant(plant, [target()], 10, DEFAULT_INTERVAL), null);
        assert.deepEqual(plant, before);
      }
    });
  }
});

describe("普通射手攻击间隔", () => {
  for (const interval of [6, 12, 24]) {
    it(`遵守工坊 ${interval / 10} 秒的攻击间隔`, () => {
      const plant = plantAt("pea");
      const zombies = [target()];
      assert.equal(stepPlant(plant, zombies, 0.3, interval), "shoot");
      for (let cycle = 0; cycle < 3; cycle += 1) {
        assert.equal(stepPlant(plant, zombies, interval / 20, interval), null);
        assert.equal(stepPlant(plant, zombies, interval / 20, interval), "shoot");
        assert.equal(stepPlant(plant, zombies, 0, interval), null);
      }
    });
  }

  it("下一轮使用调整后的特效间隔", () => {
    const plant = plantAt("pea");
    const zombies = [target()];
    assert.equal(stepPlant(plant, zombies, 0.3, 12), "shoot");
    assert.equal(stepPlant(plant, zombies, 1.2, 6), "shoot");
    assert.equal(stepPlant(plant, zombies, 0.3, 6), null);
    assert.equal(stepPlant(plant, zombies, 0.3, 6), "shoot");
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGameState, createGameController, DEFAULT_EFFECT } from '../common/game.js';
function setup() {
  const game = createGameState();
  const controller = createGameController(game, { effect: { ...DEFAULT_EFFECT }, assets: {} });
  const advance = seconds => { for (let i = 0; i < seconds * 100; i++) controller.updateGame(.01); };
  return { game, controller, advance };
}
test('种植扣费、占位和阳光不足不会重复种植，铲除按实际费用返还', () => {
  const { game, controller } = setup();
  game.selectedPlantType = 'cherry';
  controller.placeOrRemove(0, 0); controller.placeOrRemove(0, 0); controller.placeOrRemove(1, 0);
  assert.equal(game.plants.length, 1); assert.equal(game.sun, 50);
  game.selectedTool = 'shovel'; controller.placeOrRemove(0, 0);
  assert.equal(game.sun, 95); assert.equal(game.plants.length, 0);
});
test('暂停冻结所有计时，重置清除战斗状态', () => {
  const { game, controller, advance } = setup();
  game.selectedPlantType = 'sunflower'; controller.placeOrRemove(0, 0);
  controller.toggleGame(); advance(4.1); controller.toggleGame();
  assert.equal(game.sun, 175);
  const snapshot = JSON.stringify(game); advance(10);
  assert.equal(JSON.stringify(game), snapshot);
  controller.resetGame(); assert.equal(game.sun, 200); assert.equal(game.plants.length, 0); assert.equal(game.spawned, 0); assert.equal(game.running, false);
});
test('阳光球只能收集一次', () => {
  const { game, controller } = setup();
  game.suns.push({ id: 7, row: 0, col: 0, ttl: 12 });
  controller.collectSun(7); controller.collectSun(7);
  assert.equal(game.sun, 225); assert.equal(game.suns.length, 0);
});
test('割草机清理一行且不会重复计数，再次突破则失败', () => {
  const { game, controller } = setup();
  game.running = true; game.spawned = game.total;
  const zombie = (id, row, x) => ({ id, row, x, hp: 100, maxHp: 100, speed: .2, slow: 0, hit: 0, attackClock: 0 });
  game.zombies = [zombie(1, 0, -.2), zombie(2, 0, 3), zombie(3, 1, 8)];
  controller.updateGame(.01);
  assert.equal(game.killed, 2); assert.equal(game.mowers[0], false); assert.equal(game.zombies.length, 1);
  game.zombies.push(zombie(4, 0, -.2)); controller.updateGame(.01);
  assert.equal(game.ended, true); assert.equal(game.won, false); assert.equal(game.running, false);
});
test('全部敌人消灭后胜利，再来一局可重置', () => {
  const { game, controller } = setup();
  game.running = true; game.spawned = game.total; game.killed = game.total;
  controller.updateGame(.01);
  assert.equal(game.ended, true); assert.equal(game.won, true);
  controller.toggleGame(); assert.equal(game.ended, false); assert.equal(game.sun, 200); assert.equal(game.killed, 0);
});

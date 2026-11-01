<template>
  <view class="studio">
    <view class="topbar">
      <view class="brand"><view class="brand-mark"><AppIcon name="sprout" /></view><view><text class="tag-strong">植击实验室</text><text class="tag-small">自定义草坪防线</text></view></view>
      <view class="top-actions">
        <text class="save-state">自动保存</text>
        <button id="soundToggle" class="icon-button" :aria-label="muted ? '开启音效' : '关闭音效'" @click="muted = !muted"><AppIcon :name="muted ? 'volume-x' : 'volume-2'" /></button>
        <button class="secondary-button compact" aria-label="恢复全部默认设置" @click="resetEverything"><AppIcon name="rotate-ccw" /><text class="tag-span">恢复默认</text></button>
      </view>
    </view>
    <view class="studio-layout">
      <view class="panel asset-panel">
        <view class="panel-heading"><view class="section-icon"><AppIcon name="images" /></view><view><text class="tag-h2">素材库</text><text class="tag-p">每种植物单独换装</text></view></view>
        <view class="asset-list">
          <view v-for="item in assetItems" :key="item.key" class="asset-item">
            <view class="asset-thumb checkerboard"><image :id="item.key === 'zombie' ? 'zombiePreview' : 'plantPreview'" class="content-image" :src="assets[item.key]" mode="aspectFit" /></view>
            <view class="asset-info"><text :id="item.key === 'zombie' ? 'zombieName' : 'selectedPlantName'" class="tag-strong">{{ item.name }}</text><text class="tag-span">{{ assetNames[item.key] }}</text></view>
            <button class="icon-button small" :aria-label="'上传' + item.name + '图片'" @click="uploadAsset(item.key)"><AppIcon name="upload" /></button>
            <button class="icon-button small" :aria-label="'恢复默认' + item.name" @click="resetAsset(item.key)"><AppIcon name="undo-2" /></button>
          </view>
        </view>
        <view class="tool-divider" /><text class="tool-label tag-p">当前植物档案</text>
        <view class="plant-profile">
          <view class="profile-art"><image class="content-image" :src="assets[selectedPlant.assetKey]" mode="aspectFit" /></view>
          <text class="tag-strong">{{ selectedPlant.name }}</text><text class="tag-span">{{ selectedPlant.cost }} 阳光 · {{ selectedPlant.hp }} 生命</text>
          <text class="tag-p">{{ selectedPlant.description }}</text>
        </view>
        <text class="skin-hint tag-p">先选择草坪上方的植物卡，再上传图片。只替换这一种植物。</text>
        <view class="asset-note"><AppIcon name="info" /><text class="tag-p">从相册选择图片，单张不超过 5 MB。建议使用透明背景 PNG。</text></view>
      </view>
      <view class="game-column">
        <view class="battle-toolbar"><view><text class="eyebrow tag-p">当前关卡</text><text class="tag-h1">后院试验场</text></view>
          <view class="battle-stats"><view class="stat sun-stat"><AppIcon name="sun-medium" /><text id="sunCount">{{ game.sun }}</text></view><view class="stat"><AppIcon name="skull" /><text id="killCount">{{ game.killed }} / {{ game.total }}</text></view></view>
        </view>
        <view class="seed-toolbar"><view class="tag-p">选择植物 <text class="tag-span">{{ game.selectedTool === 'shovel' ? '铲除返还 30% 阳光' : selectedPlant.name + ' · ' + selectedPlant.cost + ' 阳光' }}</text></view>
          <button class="shovel-tool" :class="{ active: game.selectedTool === 'shovel' }" @click="game.selectedTool = 'shovel'"><AppIcon name="shovel" /><text>铲除</text></button>
        </view>
        <view id="plantRoster" class="seed-bank">
          <button v-for="plant in PLANTS" :key="plant.id" class="seed-card" :class="{ selected: game.selectedTool === 'plant' && game.selectedPlantType === plant.id, unaffordable: game.sun < plant.cost }" :aria-label="plant.name + '，' + plant.cost + ' 阳光，' + plant.role" @click="selectPlant(plant.id)">
            <view class="seed-cost"><AppIcon name="sun" /><text>{{ plant.cost }}</text></view><image class="content-image" :src="assets[plant.assetKey]" mode="aspectFit" /><text class="tag-strong">{{ plant.name }}</text><text class="tag-small">{{ plant.role }}</text>
          </button>
        </view>
        <view class="wave-track"><view class="tag-span" :style="{ width: game.killed / game.total * 100 + '%' }" /></view>
        <view class="board-shell"><view id="board" class="board">
          <view class="yard-lines" />
          <view class="mower-layer"><view v-for="(available, row) in game.mowers" :key="row" class="mower" :class="{ used: !available }" :style="{ top: (row + .5) * 20 + '%' }"><AppIcon name="shield" /></view></view>
          <view class="actor-layer">
            <view v-for="plant in game.plants" :key="plant.id" class="actor plant-actor" :class="['plant-' + plant.type, { attacking: plant.pulse > 0 }]" :data-type="plant.type" :style="position(plant.row, plant.col)">
              <view class="hp-bar"><view class="tag-span" :style="{ transform: 'scaleX(' + Math.max(0, plant.hp / plant.maxHp) + ')' }" /></view>
              <image class="content-image" :src="assets[getPlant(plant.type).assetKey]" mode="aspectFit" /><text v-if="plant.type === 'cherry'" class="fuse-label">{{ plant.cooldown.toFixed(1) }}s</text>
            </view>
            <view v-for="zombie in game.zombies" :key="zombie.id" class="actor zombie-actor" :class="{ hit: zombie.hit > 0, slowed: zombie.slow > 0 }" :style="position(zombie.row, zombie.x)">
              <view class="hp-bar"><view class="tag-span" :style="{ transform: 'scaleX(' + Math.max(0, zombie.hp / zombie.maxHp) + ')' }" /></view><image class="content-image" :src="assets.zombie" mode="aspectFit" />
            </view>
            <view v-for="shot in game.projectiles" :key="shot.id" class="actor projectile" :class="[shot.type, { trail: shot.trail }]" :style="shotStyle(shot)"><image v-if="shot.image" class="content-image" :src="shot.image" mode="aspectFit" /></view>
            <view v-for="particle in game.particles" :key="particle.id" class="actor hit-effect" :class="[particle.kind || 'hit', particle.glow ? 'glow' : 'no-glow']" :style="particleStyle(particle)">{{ particle.kind === 'sun' ? '+25' : '' }}</view>
          </view>
          <view class="grid-layer"><button v-for="cell in cells" :key="cell.id" class="grid-cell" :class="{ 'remove-mode': game.selectedTool === 'shovel' }" :aria-label="'第 ' + (cell.row + 1) + ' 行，第 ' + (cell.col + 1) + ' 列'" @click="controller.placeOrRemove(cell.row, cell.col)" /></view>
          <view class="sun-layer"><button v-for="sun in game.suns" :key="sun.id" class="actor sun-drop" aria-label="收集 25 阳光" :style="position(sun.row, sun.col)" @click.stop="controller.collectSun(sun.id)"><AppIcon name="sun" /></button></view>
          <view v-if="game.showIntro || game.ended" class="board-state" :class="{ result: game.ended }"><view class="state-icon"><AppIcon :name="game.ended ? (game.won ? 'sparkles' : 'skull') : 'mouse-pointer-click'" /></view><text class="tag-strong">{{ game.ended ? (game.won ? '防守成功' : '防线失守') : '布置你的防线' }}</text><text class="tag-span">{{ game.ended ? (game.won ? '全部僵尸已经被清除' : '调整布置后再试一次') : '选择植物，再点击草坪格子' }}</text></view>
        </view></view>
        <view class="game-controls">
          <button id="playButton" class="primary-button" @click="controller.toggleGame"><AppIcon :name="game.running ? 'pause' : 'play'" /><text>{{ game.ended ? '再来一局' : game.running ? '暂停游戏' : game.spawned ? '继续游戏' : '开始游戏' }}</text></button>
          <button class="secondary-button" @click="controller.resetGame"><AppIcon name="refresh-cw" /><text>重新布置</text></button>
          <view class="event-message"><AppIcon name="crosshair" /><text class="tag-span">{{ game.message }}</text></view>
        </view>
      </view>
      <view class="panel effect-panel">
        <view class="panel-heading"><view class="section-icon"><AppIcon name="sparkles" /></view><view><text class="tag-h2">攻击工坊</text><text class="tag-p">三种射手共用 · 调整后生效</text></view></view>
        <view class="effect-preview"><view class="preview-plant"><image class="content-image" :src="assets[selectedPlant.shooter ? selectedPlant.assetKey : 'plant']" mode="aspectFit" /></view><view class="preview-lane"><view class="tag-span" /></view><view class="preview-shot" :style="previewStyle"><image v-if="assets.projectile" class="content-image" :src="assets.projectile" mode="aspectFit" /></view><view class="preview-target"><AppIcon name="crosshair" /></view></view>
        <view class="control-group"><text class="tag-legend">弹道类型</text><view class="segmented"><button v-for="type in effectTypes" :key="type.id" :class="{ active: effect.type === type.id }" @click="setEffect('type', type.id)"><AppIcon :name="type.icon" /><text class="tag-span">{{ type.name }}</text></button></view></view>
        <view class="control-row color-row"><text>特效颜色</text><view class="color-control"><view class="color-swatch" :style="{ background: effect.color }" /><input class="color-input" :value="effect.color" maxlength="7" aria-label="特效颜色" @change="setColor" /></view></view>
        <view v-for="control in ranges" :key="control.key" class="range-stack"><label><text>{{ control.label }}</text><text class="tag-output">{{ effectValue(control.key) }}</text></label><slider class="native-slider" :value="effect[control.key]" :min="control.min" :max="control.max" :step="control.step" activeColor="#6e9935" :block-size="18" @changing="setEffect(control.key, $event.detail.value, false)" @change="setEffect(control.key, $event.detail.value)" /></view>
        <view class="toggle-list"><view class="toggle-row"><text class="tag-span">运动拖尾</text><switch :checked="effect.trail" color="#6e9935" @change="setEffect('trail', $event.detail.value)" /></view><view class="toggle-row"><text class="tag-span">命中光效</text><switch :checked="effect.glow" color="#6e9935" @change="setEffect('glow', $event.detail.value)" /></view></view>
        <view class="custom-projectile"><view class="custom-copy"><text class="tag-strong">自定义弹体图片</text><text class="tag-span">{{ assetNames.projectile }}</text></view><button class="icon-button small" aria-label="上传弹体图片" @click="uploadAsset('projectile')"><AppIcon name="image-plus" /></button><button class="icon-button small" aria-label="移除弹体图片" @click="resetAsset('projectile')"><AppIcon name="x" /></button></view>
        <button class="text-button" @click="resetEffect"><AppIcon name="rotate-ccw" /><text>重置特效参数</text></button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, onUnmounted } from 'vue';
import { onShow, onHide, onUnload } from '@dcloudio/uni-app';
import AppIcon from '../../components/AppIcon.vue';
import { PLANTS, getPlant } from '../../common/plants.js';
import { createGameState, createGameController, DEFAULT_EFFECT } from '../../common/game.js';
import { loadSettings, saveSettings, chooseAsset, removeAssetFile } from '../../common/storage.js';
const defaults = { zombie: '/static/default-zombie.png', projectile: '' };
PLANTS.forEach(plant => { defaults[plant.assetKey] = plant.image; });
const saved = loadSettings();
const assets = reactive({ ...defaults, ...saved.assets });
const assetNames = reactive(Object.fromEntries(Object.keys(defaults).map(key => [key, saved.assetNames?.[key] || (key === 'projectile' ? '未上传' : '默认素材')])));
const effect = reactive({ ...DEFAULT_EFFECT, ...saved.effect });
const game = reactive(createGameState());
const muted = ref(false);
const selectedPlant = computed(() => getPlant(game.selectedPlantType));
const assetItems = computed(() => [{ key: selectedPlant.value.assetKey, name: selectedPlant.value.name }, { key: 'zombie', name: '僵尸' }]);
const cells = Array.from({ length: 45 }, (_, id) => ({ id, row: Math.floor(id / 9), col: id % 9 }));
const effectTypes = [{ id: 'pea', name: '能量豆', icon: 'circle' }, { id: 'fire', name: '火球', icon: 'flame' }, { id: 'ice', name: '冰晶', icon: 'snowflake' }, { id: 'bolt', name: '闪电', icon: 'zap' }];
const ranges = [{ key: 'size', label: '弹体大小', min: 10, max: 34, step: 1 }, { key: 'speed', label: '飞行速度', min: 1, max: 5, step: 1 }, { key: 'damage', label: '攻击伤害', min: 10, max: 60, step: 5 }, { key: 'interval', label: '攻击间隔', min: 6, max: 24, step: 1 }];
const notify = title => uni.showToast({ title, icon: 'none' });
let audio, lastSound = 0;
function sound() {
  if (muted.value || Date.now() - lastSound < 100) return;
  lastSound = Date.now();
  if (!audio) { audio = uni.createInnerAudioContext(); audio.src = '/static/audio/action.wav'; audio.volume = .15; audio.onError(() => {}); }
  audio.stop(); audio.play();
}
const controller = createGameController(game, { effect, assets, notify, sound });
function selectPlant(type) { game.selectedPlantType = type; game.selectedTool = 'plant'; }
function persist() { return saveSettings({ assets, assetNames, effect }, notify); }
function setEffect(key, value, save = true) { effect[key] = value; if (save) persist(); }
function setColor(event) { const value = event.detail.value.trim(); if (/^#[0-9a-f]{6}$/i.test(value)) setEffect('color', value); else notify('请输入六位十六进制颜色，例如 #D7FF3F'); }
function effectValue(key) { return key === 'size' ? effect.size + ' px' : key === 'interval' ? (effect.interval / 10).toFixed(1) + ' 秒' : key === 'speed' ? ['', '很慢', '慢速', '中速', '快速', '极速'][effect.speed] : effect[key]; }
const revisions = {};
async function uploadAsset(key) {
  const revision = (revisions[key] || 0) + 1; revisions[key] = revision;
  try {
    const result = await chooseAsset();
    if (revisions[key] !== revision) { removeAssetFile(result.path); return; }
    const previous = assets[key]; assets[key] = result.path; assetNames[key] = result.name;
    if (persist()) { removeAssetFile(previous); notify('素材已更新'); }
  } catch (error) { if (!/cancel/i.test(error.errMsg || '')) notify(error.message || '无法读取图片'); }
}
function resetAsset(key) { revisions[key] = (revisions[key] || 0) + 1; const previous = assets[key]; assets[key] = defaults[key]; assetNames[key] = key === 'projectile' ? '未上传' : '默认素材'; if (persist()) removeAssetFile(previous); }
function resetEffect() { Object.assign(effect, DEFAULT_EFFECT); persist(); }
function resetEverything() { const previous = Object.values(assets); for (const key of Object.keys(defaults)) { revisions[key] = (revisions[key] || 0) + 1; assets[key] = defaults[key]; assetNames[key] = key === 'projectile' ? '未上传' : '默认素材'; } Object.assign(effect, DEFAULT_EFFECT); if (persist()) previous.forEach(removeAssetFile); selectPlant('pea'); controller.resetGame(); notify('素材、特效和关卡已恢复默认'); }
const position = (row, x) => ({ left: (x + .5) / 9 * 100 + '%', top: (row + .5) * 20 + '%' });
const shotStyle = shot => ({ ...position(shot.row, shot.x), '--shot-size': shot.size + 'px', '--shot-color': shot.color });
const particleStyle = particle => ({ ...position(particle.row, particle.x), '--hit-size': particle.size + 'px', '--hit-color': particle.color, animationDuration: (particle.kind === 'sun' ? .8 : particle.kind === 'blast' ? .65 : .42) + 's', ...(particle.kind === 'blast' ? { width: '33.33%', height: '60%' } : {}) });
const previewStyle = computed(() => ({ width: effect.size + 'px', height: (effect.type === 'bolt' ? effect.size * .5 : effect.size) + 'px', background: effect.color, borderRadius: effect.type === 'ice' ? '3px' : effect.type === 'bolt' ? '2px 60% 60% 2px' : '50%', boxShadow: effect.trail ? '-9px 0 10px ' + effect.color : 'none', animationDuration: (2.4 - effect.speed * .28) + 's' }));
let timer, lastTime;
function startLoop() { if (timer) return; lastTime = Date.now(); timer = setInterval(() => { const now = Date.now(); controller.updateGame(Math.min(.05, (now - lastTime) / 1000)); lastTime = now; }, 33); }
function stopLoop() { clearInterval(timer); timer = null; if (game.running) { game.running = false; game.message = '游戏已暂停'; } audio?.stop(); }
function dispose() { stopLoop(); audio?.destroy(); audio = null; }
onShow(startLoop); onHide(stopLoop); onUnload(dispose); onUnmounted(dispose);
</script>

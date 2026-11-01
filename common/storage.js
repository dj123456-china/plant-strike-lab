const STORAGE_KEY = 'garden-guard-uni-v2';
export function loadSettings() {
  try { const saved = uni.getStorageSync(STORAGE_KEY); return saved && typeof saved === 'object' ? saved : {}; }
  catch { return {}; }
}
export function saveSettings(settings, notify) {
  try { uni.setStorageSync(STORAGE_KEY, JSON.parse(JSON.stringify(settings))); return true; }
  catch { notify('设置暂时无法保存，本次仍可使用'); return false; }
}
export async function chooseAsset() {
  const result = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album'] });
  const file = result.tempFiles[0];
  if (file.size > 5 * 1024 * 1024) throw new Error('图片不能超过 5 MB');
  const path = result.tempFilePaths[0];
  await uni.getImageInfo({ src: path });
  // #ifdef H5
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('无法读取图片')); reader.readAsDataURL(file);
  });
  return { path: data, name: file.name || '自定义图片' };
  // #endif
  // #ifndef H5
  const saved = await uni.saveFile({ tempFilePath: path });
  return { path: saved.savedFilePath, name: file.name || '自定义图片' };
  // #endif
}
export function removeAssetFile(path) {
  // #ifndef H5
  if (path && !path.startsWith('/static/') && !path.startsWith('data:')) uni.removeSavedFile({ filePath: path, fail() {} });
  // #endif
}

export function vibrate(save, pattern) {
  if (!save.data.settings.vibration || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

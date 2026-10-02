// Export via the iOS share sheet (Save to Files -> OneDrive), import from a picked file.
import { normalise } from './store.js';

const backupFileName = (now = new Date()) => `lift-tracker-${now.toISOString().slice(0, 10)}.json`;

const toFile = (data) =>
  new File([JSON.stringify(data, null, 2)], backupFileName(), { type: 'application/json' });

function download(file) {
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Must be called directly from a tap handler: iOS only opens the share sheet after a user gesture.
// Returns false if the user cancelled.
export async function exportData(data) {
  const file = toFile(data);
  if (!navigator.canShare?.({ files: [file] })) {
    download(file);
    return true;
  }
  try {
    await navigator.share({ files: [file] });
    return true;
  } catch (err) {
    if (err.name === 'AbortError') return false;
    throw err;
  }
}

export async function readBackup(file) {
  return normalise(JSON.parse(await file.text()));
}

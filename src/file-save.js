export class SaveCancelledError extends Error {
  constructor() {
    super('Save cancelled');
    this.name = 'SaveCancelledError';
  }
}

export function isTauriShell() {
  return Boolean(globalThis.__TAURI_INTERNALS__ || globalThis.__TAURI__);
}

export async function saveBlob(blob, fileName, filters = []) {
  if (isTauriShell()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: fileName,
      filters: filters.length ? filters : undefined,
    });
    if (!path) throw new SaveCancelledError();
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return path;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return fileName;
}

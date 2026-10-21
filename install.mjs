import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const name = 'dsh-lucy-codex-bridge';
const source = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(os.homedir(), 'Documents', 'Codex', 'plugins', name);
const profile = path.join(os.homedir(), '.dsh', 'profiles', 'desktop');
const manifestPath = path.join(profile, 'package.json');
const original = await fs.readFile(manifestPath, 'utf8');
const manifest = JSON.parse(original);
const uninstall = process.argv.includes('--uninstall');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = manifestPath + '.bridge-backup-' + stamp;
const link = path.join(profile, 'node_modules', name);

if (!uninstall) {
  try {
    const existing = await fs.lstat(link);
    if (!existing.isSymbolicLink() || path.resolve(await fs.realpath(link)) !== path.resolve(target)) {
      throw new Error('Existing plugin path is not this installer\'s link: ' + link);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(target, { recursive: true });
  for (const entry of ['package.json', 'cordis.patch.yml', 'README.md', 'lib']) {
    await fs.cp(path.join(source, entry), path.join(target, entry), { recursive: true });
  }
  try { await fs.lstat(link); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  }
  manifest.dependencies ??= {};
  manifest.dependencies[name] = 'link:' + target.replaceAll('\\', '/');
  manifest.dsh ??= {};
  manifest.dsh.profile ??= {};
  manifest.dsh.profile.bundles ??= [];
  if (!manifest.dsh.profile.bundles.includes(name)) manifest.dsh.profile.bundles.push(name);
} else {
  delete manifest.dependencies?.[name];
  if (manifest.dsh?.profile?.bundles) manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(item => item !== name);
  // Keep files, history and the link; no recursive deletion or rollback of unrelated plugins.
}
await fs.copyFile(manifestPath, backup);
const temporary = manifestPath + '.bridge-new-' + stamp;
await fs.writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
// Do not overwrite another process's intervening manifest edit.
if (await fs.readFile(manifestPath, 'utf8') !== original) throw new Error('Profile changed during installation; no manifest change applied.');
await fs.rename(temporary, manifestPath);
console.log(JSON.stringify({ installed: !uninstall, name, target, backup, requiresRestart: true }, null, 2));

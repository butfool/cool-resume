import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LICENSE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'LICENCE.txt'];

function resolvePackageDir(packageName, fromDir) {
  let current = fromDir;
  while (true) {
    const candidate = path.join(current, 'node_modules', ...packageName.split('/'));
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function readLicense(packageDir, packageName) {
  const licenseFile = LICENSE_NAMES
    .map(name => path.join(packageDir, name))
    .find(file => fs.existsSync(file));
  if (!licenseFile) throw new Error(`Missing license file for runtime dependency: ${packageName}`);
  return fs.readFileSync(licenseFile, 'utf8').trim();
}

export function buildThirdPartyNotices() {
  const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const packages = new Map();

  function visit(packageName, fromDir, optional = false) {
    const packageDir = resolvePackageDir(packageName, fromDir);
    if (!packageDir && optional) return;
    if (!packageDir) throw new Error(`Cannot resolve runtime dependency: ${packageName}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
    const key = `${manifest.name}@${manifest.version}`;
    if (packages.has(key)) return;
    packages.set(key, {
      name: manifest.name,
      version: manifest.version,
      declaredLicense: manifest.license || 'See included license text',
      licenseText: readLicense(packageDir, key),
    });
    const optionalDependencies = Object.keys(manifest.optionalDependencies || {});
    Object.keys(manifest.dependencies || {})
      .filter(dependency => !optionalDependencies.includes(dependency))
      .sort()
      .forEach(dependency => visit(dependency, packageDir));
    optionalDependencies.sort().forEach(dependency => visit(dependency, packageDir, true));
  }

  Object.keys(project.dependencies || {}).sort().forEach(dependency => visit(dependency, ROOT));

  const sections = [...packages.values()]
    .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version))
    .map(item => [
      '================================================================================',
      `${item.name}@${item.version} (${item.declaredLicense})`,
      '================================================================================',
      item.licenseText,
    ].join('\n'));

  return [
    'PROJECT LICENSE',
    '',
    fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8').trim(),
    '',
    'THIRD-PARTY LICENSE NOTICES',
    '',
    'This single-file build contains code from the packages listed below.',
    'The notices are generated from the installed packages used by this build.',
    '',
    ...sections,
  ].join('\n\n');
}

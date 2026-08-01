/**
 * @file linux-ime-config.test.ts
 * @description Regression tests for Linux WebKit detached-preedit configuration.
 */

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_TAURI = path.resolve(__dirname, '../src-tauri');
const libSource = fs.readFileSync(path.join(SRC_TAURI, 'src/lib.rs'), 'utf-8');
const cargoSource = fs.readFileSync(path.join(SRC_TAURI, 'Cargo.toml'), 'utf-8');

function stripRustComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function extractLinuxFunctionSource(source: string, functionName: string): string | undefined {
  const signature = new RegExp(
    `#\\[cfg\\(target_os = "linux"\\)\\]\\s*fn ${functionName}\\s*\\(`,
  );
  const match = signature.exec(source);
  if (!match) return undefined;

  const bodyStart = source.indexOf('{', match.index);
  if (bodyStart === -1) return undefined;

  let braceDepth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') braceDepth += 1;
    if (source[index] === '}') braceDepth -= 1;
    if (braceDepth === 0) return source.slice(match.index, index + 1);
  }

  return undefined;
}

function extractTauriSetupSource(source: string): string | undefined {
  const signature = /\.setup\(\|app\|\s*\{/;
  const match = signature.exec(source);
  if (!match) return undefined;

  const bodyStart = source.indexOf('{', match.index);
  if (bodyStart === -1) return undefined;

  let braceDepth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') braceDepth += 1;
    if (source[index] === '}') braceDepth -= 1;
    if (braceDepth === 0) return source.slice(match.index, index + 1);
  }

  return undefined;
}

const linuxImeFunctionSource = extractLinuxFunctionSource(
  stripRustComments(libSource),
  'configure_linux_webkit_ime',
);
const tauriSetupSource = extractTauriSetupSource(stripRustComments(libSource));
const linuxDependenciesSectionMatch = cargoSource.match(
  /(\[target\.'cfg\(target_os = "linux"\)'\.dependencies\][\s\S]*?)(?=\n\s*\[[^\]]+\]|\s*$)/,
);
const linuxDependenciesSection = linuxDependenciesSectionMatch?.[1];
const activeWebkitDependencyDeclarations = cargoSource
  .replace(/#.*/g, '')
  .match(/^\s*webkit2gtk\s*=/gm) ?? [];

describe('Linux IME configuration', () => {
  it('configures the Linux IME in one main webview block', () => {
    expect(
      linuxImeFunctionSource,
      'Linux IME configuration function block must exist',
    ).toBeDefined();
    expect(linuxImeFunctionSource).toMatch(
      /get_webview_window\("main"\)[\s\S]*with_webview[\s\S]*set_enable_preedit\(true\)/,
    );
  });

  it('does not disable compositing mode', () => {
    expect(libSource).not.toContain('WEBKIT_DISABLE_COMPOSITING_MODE');
  });

  it('configures Linux IME before starting the sidecar', () => {
    expect(tauriSetupSource, 'Tauri setup block must exist').toBeDefined();
    expect(tauriSetupSource).toMatch(/^\s*configure_linux_webkit_ime\(app\)\?;\s*$/m);

    const configureIndex = tauriSetupSource!.indexOf('configure_linux_webkit_ime(app)?;');
    const sidecarIndex = tauriSetupSource!.indexOf('spawn_backend_sidecar');

    expect(sidecarIndex, 'sidecar startup must exist in the setup block').toBeGreaterThan(-1);
    expect(configureIndex).toBeGreaterThanOrEqual(0);
    expect(configureIndex).toBeLessThan(sidecarIndex);
  });

  it('declares the pinned WebKitGTK dependency in the Linux section', () => {
    expect(
      linuxDependenciesSection,
      'Linux target dependency section must exist',
    ).toBeDefined();
    expect(linuxDependenciesSection).toMatch(/^webkit2gtk = "=2\.0\.2"$/m);
    expect(activeWebkitDependencyDeclarations).toHaveLength(1);
  });
});

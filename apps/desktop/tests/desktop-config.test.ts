/**
 * @file desktop-config.test.ts
 * @description Tests validating the Tauri desktop configuration files
 * are correctly structured for building the DBMS Platform desktop app.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Resolve paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SRC_TAURI = path.join(__dirname, '..', 'src-tauri');
const API_DIR = path.join(PROJECT_ROOT, 'api');

describe('Desktop Configuration', () => {
  describe('tauri.conf.json', () => {
    const configPath = path.join(SRC_TAURI, 'tauri.conf.json');

    it('should exist and be valid JSON', () => {
      expect(fs.existsSync(configPath)).toBe(true);
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      expect(config).toBeDefined();
    });

    it('should have correct product metadata', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.productName).toBe('DBMS-Platform');
      expect(config.identifier).toBe('com.dbms.platform');
      expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should point frontendDist to Vite output directory', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // Vite outputs to "dist", not "out" (legacy Next.js)
      expect(config.build.frontendDist).toContain('dist');
      expect(config.build.frontendDist).not.toContain('out');
    });

    it('should configure the backend sidecar in externalBin', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.bundle.externalBin).toContain('bin/api');
    });

    it('should reference icon files that exist', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const icons: string[] = config.bundle.icon;
      expect(icons).toBeDefined();
      expect(icons.length).toBeGreaterThan(0);

      for (const icon of icons) {
        const iconPath = path.join(SRC_TAURI, icon);
        expect(fs.existsSync(iconPath), `Icon file should exist: ${icon}`).toBe(true);
      }
    });

    it('should configure window with reasonable dimensions', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const window = config.app.windows[0];
      expect(window.width).toBeGreaterThanOrEqual(960);
      expect(window.height).toBeGreaterThanOrEqual(600);
      expect(window.resizable).toBe(true);
      expect(window.title).toBe('DBMS Platform');
    });

    it('should not bundle docker-compose (desktop should not require Docker)', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const resources: string[] = config.bundle.resources || [];
      const hasDocker = resources.some((r) => r.includes('docker-compose'));
      expect(hasDocker).toBe(false);
    });
  });

  describe('Cargo.toml', () => {
    it('should exist and contain required dependencies', () => {
      const cargoPath = path.join(SRC_TAURI, 'Cargo.toml');
      expect(fs.existsSync(cargoPath)).toBe(true);

      const content = fs.readFileSync(cargoPath, 'utf-8');
      expect(content).toContain('tauri');
      expect(content).toContain('tauri-plugin-shell');
      expect(content).toContain('tauri-plugin-log');
      expect(content).toContain('reqwest');
      expect(content).toContain('tokio');
    });
  });

  describe('capabilities/default.json', () => {
    it('should exist and grant shell permissions', () => {
      const capPath = path.join(SRC_TAURI, 'capabilities', 'default.json');
      expect(fs.existsSync(capPath)).toBe(true);

      const cap = JSON.parse(fs.readFileSync(capPath, 'utf-8'));
      expect(cap.permissions).toBeDefined();

      // Should have core:default
      const hasCore = cap.permissions.some(
        (p: any) => p === 'core:default' || p?.identifier === 'core:default'
      );
      expect(hasCore).toBe(true);

      // Should have shell execution permissions
      const permStrings = cap.permissions
        .filter((p: any) => typeof p === 'string')
        .join(' ');
      expect(permStrings).toContain('shell');
    });
  });

  describe('Icons', () => {
    it('should have the system DBMS Platform icon (not default Tauri icon)', () => {
      const iconPath = path.join(SRC_TAURI, 'icons', 'icon.ico');
      expect(fs.existsSync(iconPath)).toBe(true);

      // icon.ico should be larger than 10KB (system logo is detailed)
      const stat = fs.statSync(iconPath);
      expect(stat.size).toBeGreaterThan(10000);
    });

    it('should have all required icon sizes', () => {
      const requiredIcons = [
        'icons/32x32.png',
        'icons/128x128.png',
        'icons/128x128@2x.png',
        'icons/icon.icns',
        'icons/icon.ico',
        'icons/icon.png',
      ];

      for (const icon of requiredIcons) {
        const iconPath = path.join(SRC_TAURI, icon);
        expect(fs.existsSync(iconPath), `Icon should exist: ${icon}`).toBe(true);
      }
    });
  });

  describe('Sidecar Binary', () => {
    it('should have at least one sidecar binary in bin/', () => {
      const binDir = path.join(SRC_TAURI, 'bin');
      expect(fs.existsSync(binDir)).toBe(true);

      const files = fs.readdirSync(binDir);
      const exeFiles = files.filter((f) => f.startsWith('api') && f.endsWith('.exe'));
      expect(exeFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Backend app.py', () => {
    it('should bind to 127.0.0.1 by default for security', () => {
      const appPath = path.join(API_DIR, 'app.py');
      const content = fs.readFileSync(appPath, 'utf-8');

      // Should use 127.0.0.1 as default, not 0.0.0.0
      expect(content).toContain("'127.0.0.1'");
      expect(content).not.toMatch(/app\.run\(host=['"]0\.0\.0\.0['"]/);
    });

    it('should support FLASK_HOST env var for override', () => {
      const appPath = path.join(API_DIR, 'app.py');
      const content = fs.readFileSync(appPath, 'utf-8');
      expect(content).toContain('FLASK_HOST');
    });
  });
});

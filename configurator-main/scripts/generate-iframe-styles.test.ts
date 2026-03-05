/**
 * Tests for generate-iframe-styles.ts
 *
 * Run: npm test
 */

import { describe, test, expect } from '@jest/globals';
import {
  extractStylesFromVue,
  extractStylesFromCSS,
  minifyCSS,
  escapeForTemplateLiteral,
  generateStyles,
  generateOutputContent,
  main,
  findFilesRecursively,
  discoverStyleSources,
  type FileSystem,
  type DirEntry,
} from './generate-iframe-styles';

describe('extractStylesFromVue', () => {
  test('extracts single style block', () => {
    const vue = `
      <template><div></div></template>
      <script>export default {}</script>
      <style>
        .foo { color: red; }
      </style>
    `;
    const result = extractStylesFromVue(vue);
    expect(result).toContain('.foo { color: red; }');
  });

  test('extracts multiple style blocks', () => {
    const vue = `
      <template><div></div></template>
      <style>.foo { color: red; }</style>
      <style scoped>.bar { color: blue; }</style>
    `;
    const result = extractStylesFromVue(vue);
    expect(result).toContain('.foo { color: red; }');
    expect(result).toContain('.bar { color: blue; }');
  });

  test('returns empty string when no styles', () => {
    const vue = `<template><div></div></template>`;
    const result = extractStylesFromVue(vue);
    expect(result).toBe('');
  });
});

describe('extractStylesFromCSS', () => {
  test('returns content unchanged', () => {
    const css = '.foo { color: red; }';
    const result = extractStylesFromCSS(css);
    expect(result).toBe(css);
  });
});

describe('minifyCSS', () => {
  test('removes comments', () => {
    const css = '/* comment */ .foo { color: red; }';
    const result = minifyCSS(css);
    expect(result).not.toContain('comment');
  });

  test('removes extra whitespace', () => {
    const css = '.foo   {   color:   red;   }';
    const result = minifyCSS(css);
    expect(result).toBe('.foo{color:red}');
  });

  test('removes newlines', () => {
    const css = `.foo {
      color: red;
      background: blue;
    }`;
    const result = minifyCSS(css);
    expect(result).not.toContain('\n');
  });

  test('removes trailing semicolons before braces', () => {
    const css = '.foo { color: red; }';
    const result = minifyCSS(css);
    expect(result).toBe('.foo{color:red}');
  });
});

describe('escapeForTemplateLiteral', () => {
  test('escapes backticks', () => {
    const str = 'content with `backticks`';
    const result = escapeForTemplateLiteral(str);
    expect(result).toBe('content with \\`backticks\\`');
  });

  test('escapes dollar signs', () => {
    const str = 'content with $variable';
    const result = escapeForTemplateLiteral(str);
    expect(result).toBe('content with \\$variable');
  });
});

describe('generateStyles', () => {
  test('combines styles from multiple files', () => {
    const mockFs: FileSystem = {
      readFile: (path: string) => {
        if (path.includes('global.css')) {
          return '.global { color: red; }';
        }
        if (path.includes('Button.vue')) {
          return '<template></template><style>.button { color: blue; }</style>';
        }
        return '';
      },
      writeFile: () => {},
      exists: () => true,
      readDir: () => [],
    };
    
    const result = generateStyles('/src', ['global.css', 'Button.vue'], mockFs);
    expect(result).toContain('.global { color: red; }');
    expect(result).toContain('.button { color: blue; }');
  });

  test('skips missing files', () => {
    const mockFs: FileSystem = {
      readFile: () => '.foo { color: red; }',
      writeFile: () => {},
      exists: (path: string) => !path.includes('missing'),
      readDir: () => [],
    };
    
    const result = generateStyles('/src', ['exists.css', 'missing.css'], mockFs);
    expect(result).toContain('.foo');
  });

  test('uses auto-discovery when sources not provided', () => {
    const mockReadDir = (dir: string): DirEntry[] => {
      if (dir.includes('/styles')) {
        return [
          { name: 'global.css', isFile: () => true, isDirectory: () => false },
        ];
      }
      if (dir.includes('/components')) {
        return [
          { name: 'Button.vue', isFile: () => true, isDirectory: () => false },
        ];
      }
      return [];
    };
    
    const mockFs: FileSystem = {
      readFile: (path: string) => {
        if (path.includes('global.css')) {
          return '.global { color: red; }';
        }
        if (path.includes('Button.vue')) {
          return '<style>.button { color: blue; }</style>';
        }
        return '';
      },
      writeFile: () => {},
      exists: (path: string) => {
        return path.includes('/styles') || path.includes('/components');
      },
      readDir: mockReadDir,
    };
    
    const result = generateStyles('/src', undefined, mockFs);
    expect(result).toContain('.global { color: red; }');
    expect(result).toContain('.button { color: blue; }');
  });
});

describe('generateOutputContent', () => {
  test('generates valid TypeScript', () => {
    const result = generateOutputContent('.foo{color:red}');
    expect(result).toContain('export const IFRAME_STYLES');
    expect(result).toContain('.foo{color:red}');
    expect(result).toContain('AUTO-GENERATED');
  });
});

describe('main', () => {
  test('generates output file', () => {
    let writtenPath = '';
    let writtenContent = '';
    
    const mockReadDir = (dir: string): DirEntry[] => {
      if (dir.includes('/styles')) {
        return [
          { name: 'global.css', isFile: () => true, isDirectory: () => false },
        ];
      }
      if (dir.includes('/components')) {
        return [
          { name: 'Component.vue', isFile: () => true, isDirectory: () => false },
        ];
      }
      return [];
    };
    
    const mockFs: FileSystem = {
      readFile: (path: string) => {
        if (path.includes('.css')) {
          return '.global { color: red; }';
        }
        if (path.includes('.vue')) {
          return '<style>.component { color: blue; }</style>';
        }
        return '';
      },
      writeFile: (path: string, content: string) => {
        writtenPath = path;
        writtenContent = content;
      },
      exists: (path: string) => {
        return path.includes('/styles') || path.includes('/components');
      },
      readDir: mockReadDir,
    };
    
    const result = main('/test/src', '/test/output.ts', mockFs);
    
    expect(result.outputPath).toBe('/test/output.ts');
    expect(writtenPath).toBe('/test/output.ts');
    expect(result.rawSize).toBeGreaterThan(0);
    expect(result.minifiedSize).toBeGreaterThan(0);
    expect(result.minifiedSize).toBeLessThanOrEqual(result.rawSize);
    expect(writtenContent).toContain('IFRAME_STYLES');
  });
});

describe('findFilesRecursively', () => {
  test('finds files with matching extensions', () => {
    const mockReadDir = (dir: string): DirEntry[] => {
      if (dir === '/test') {
        return [
          { name: 'file1.vue', isFile: () => true, isDirectory: () => false },
          { name: 'file2.css', isFile: () => true, isDirectory: () => false },
          { name: 'file3.ts', isFile: () => true, isDirectory: () => false },
        ];
      }
      return [];
    };
    
    const mockFs: FileSystem = {
      readFile: () => '',
      writeFile: () => {},
      exists: () => true,
      readDir: mockReadDir,
    };
    
    const result = findFilesRecursively('/test', ['.vue', '.css'], mockFs);
    expect(result).toHaveLength(2);
    expect(result.some(f => f.includes('file1.vue'))).toBe(true);
    expect(result.some(f => f.includes('file2.css'))).toBe(true);
    expect(result.some(f => f.includes('file3.ts'))).toBe(false);
  });

  test('recursively searches subdirectories', () => {
    const mockReadDir = (dir: string): DirEntry[] => {
      if (dir === '/test') {
        return [
          { name: 'file1.vue', isFile: () => true, isDirectory: () => false },
          { name: 'subdir', isFile: () => false, isDirectory: () => true },
        ];
      }
      if (dir.includes('subdir')) {
        return [
          { name: 'file2.vue', isFile: () => true, isDirectory: () => false },
        ];
      }
      return [];
    };
    
    const mockFs: FileSystem = {
      readFile: () => '',
      writeFile: () => {},
      exists: () => true,
      readDir: mockReadDir,
    };
    
    const result = findFilesRecursively('/test', ['.vue'], mockFs);
    expect(result).toHaveLength(2);
    expect(result.some(f => f.includes('file1.vue'))).toBe(true);
    expect(result.some(f => f.includes('file2.vue'))).toBe(true);
  });

  test('handles errors gracefully', () => {
    const mockReadDir = (): DirEntry[] => {
      throw new Error('Permission denied');
    };
    
    const mockFs: FileSystem = {
      readFile: () => '',
      writeFile: () => {},
      exists: () => true,
      readDir: mockReadDir,
    };
    
    const result = findFilesRecursively('/test', ['.vue'], mockFs);
    expect(result).toHaveLength(0);
  });
});

describe('discoverStyleSources', () => {
  test('discovers CSS and Vue files', () => {
    const mockReadDir = (dir: string): DirEntry[] => {
      if (dir.includes('/styles')) {
        return [
          { name: 'global.css', isFile: () => true, isDirectory: () => false },
        ];
      }
      if (dir.includes('/components')) {
        return [
          { name: 'Button.vue', isFile: () => true, isDirectory: () => false },
          { name: 'Input.vue', isFile: () => true, isDirectory: () => false },
        ];
      }
      if (dir.includes('/app')) {
        return [
          { name: 'App.vue', isFile: () => true, isDirectory: () => false },
        ];
      }
      return [];
    };
    
    const mockFs: FileSystem = {
      readFile: () => '',
      writeFile: () => {},
      exists: (path: string) => {
        return path.includes('/styles') || path.includes('/components') || path.includes('/app');
      },
      readDir: mockReadDir,
    };
    
    const result = discoverStyleSources('/src', mockFs);
    expect(result).toHaveLength(4);
    expect(result.some(f => f.includes('global.css'))).toBe(true);
    expect(result.some(f => f.includes('Button.vue'))).toBe(true);
    expect(result.some(f => f.includes('Input.vue'))).toBe(true);
    expect(result.some(f => f.includes('App.vue'))).toBe(true);
  });

  test('returns sorted results', () => {
    const mockReadDir = (dir: string): DirEntry[] => {
      if (dir.includes('/components')) {
        return [
          { name: 'Zebra.vue', isFile: () => true, isDirectory: () => false },
          { name: 'Apple.vue', isFile: () => true, isDirectory: () => false },
          { name: 'Banana.vue', isFile: () => true, isDirectory: () => false },
        ];
      }
      return [];
    };
    
    const mockFs: FileSystem = {
      readFile: () => '',
      writeFile: () => {},
      exists: (path: string) => path.includes('/components'),
      readDir: mockReadDir,
    };
    
    const result = discoverStyleSources('/src', mockFs);
    expect(result[0]).toContain('Apple.vue');
    expect(result[1]).toContain('Banana.vue');
    expect(result[2]).toContain('Zebra.vue');
  });

  test('handles missing directories', () => {
    const mockFs: FileSystem = {
      readFile: () => '',
      writeFile: () => {},
      exists: () => false,
      readDir: () => [],
    };
    
    const result = discoverStyleSources('/src', mockFs);
    expect(result).toHaveLength(0);
  });
});
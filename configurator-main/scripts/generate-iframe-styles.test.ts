/**
 * Tests for generate-iframe-styles.ts
 *
 * Run: npm run test:scripts
 */

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
} from './generate-iframe-styles.js';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected "${expected}" but got "${actual}"`
    );
  }
}

function assertContains(str: string, substring: string, message?: string) {
  if (!str.includes(substring)) {
    throw new Error(
      message || `Expected string to contain "${substring}"`
    );
  }
}

// Tests for extractStylesFromVue
test('extractStylesFromVue: extracts single style block', () => {
  const vue = `
    <template><div></div></template>
    <script>export default {}</script>
    <style>
      .foo { color: red; }
    </style>
  `;
  const result = extractStylesFromVue(vue);
  assertContains(result, '.foo { color: red; }');
});

test('extractStylesFromVue: extracts multiple style blocks', () => {
  const vue = `
    <template><div></div></template>
    <style>.foo { color: red; }</style>
    <style scoped>.bar { color: blue; }</style>
  `;
  const result = extractStylesFromVue(vue);
  assertContains(result, '.foo { color: red; }');
  assertContains(result, '.bar { color: blue; }');
});

test('extractStylesFromVue: returns empty string when no styles', () => {
  const vue = `<template><div></div></template>`;
  const result = extractStylesFromVue(vue);
  assertEqual(result, '');
});

// Tests for extractStylesFromCSS
test('extractStylesFromCSS: returns content unchanged', () => {
  const css = '.foo { color: red; }';
  const result = extractStylesFromCSS(css);
  assertEqual(result, css);
});

// Tests for minifyCSS
test('minifyCSS: removes comments', () => {
  const css = '/* comment */ .foo { color: red; }';
  const result = minifyCSS(css);
  assertEqual(result.includes('comment'), false);
});

test('minifyCSS: removes extra whitespace', () => {
  const css = '.foo   {   color:   red;   }';
  const result = minifyCSS(css);
  assertEqual(result, '.foo{color:red}');
});

test('minifyCSS: removes newlines', () => {
  const css = `.foo {
    color: red;
    background: blue;
  }`;
  const result = minifyCSS(css);
  assertEqual(result.includes('\n'), false);
});

test('minifyCSS: removes trailing semicolons before braces', () => {
  const css = '.foo { color: red; }';
  const result = minifyCSS(css);
  assertEqual(result, '.foo{color:red}');
});

// Tests for escapeForTemplateLiteral
test('escapeForTemplateLiteral: escapes backticks', () => {
  const str = 'content with `backticks`';
  const result = escapeForTemplateLiteral(str);
  assertEqual(result, 'content with \\`backticks\\`');
});

test('escapeForTemplateLiteral: escapes dollar signs', () => {
  const str = 'content with $variable';
  const result = escapeForTemplateLiteral(str);
  assertEqual(result, 'content with \\$variable');
});

// Tests for generateStyles with mock filesystem
test('generateStyles: combines styles from multiple files', () => {
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
  assertContains(result, '.global { color: red; }');
  assertContains(result, '.button { color: blue; }');
});

test('generateStyles: skips missing files', () => {
  const mockFs: FileSystem = {
    readFile: () => '.foo { color: red; }',
    writeFile: () => {},
    exists: (path: string) => !path.includes('missing'),
    readDir: () => [],
  };
  
  const result = generateStyles('/src', ['exists.css', 'missing.css'], mockFs);
  assertContains(result, '.foo');
});

// Tests for generateOutputContent
test('generateOutputContent: generates valid TypeScript', () => {
  const result = generateOutputContent('.foo{color:red}');
  assertContains(result, 'export const IFRAME_STYLES');
  assertContains(result, '.foo{color:red}');
  assertContains(result, 'AUTO-GENERATED');
});

// Tests for main function with mock filesystem
test('main: generates output file', () => {
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
  
  assertEqual(result.outputPath, '/test/output.ts');
  assertEqual(writtenPath, '/test/output.ts', 'writtenPath should match outputPath');
  assertEqual(result.rawSize > 0, true, 'rawSize should be > 0');
  assertEqual(result.minifiedSize > 0, true, 'minifiedSize should be > 0');
  assertEqual(result.minifiedSize <= result.rawSize, true, 'minified should be <= raw');
  assertContains(writtenContent, 'IFRAME_STYLES');
});

// Tests for findFilesRecursively
test('findFilesRecursively: finds files with matching extensions', () => {
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
  assertEqual(result.length, 2, 'Should find 2 files with .vue and .css extensions');
  assertEqual(result.some(f => f.includes('file1.vue')), true, 'Should include file1.vue');
  assertEqual(result.some(f => f.includes('file2.css')), true, 'Should include file2.css');
  assertEqual(result.some(f => f.includes('file3.ts')), false, 'Should not include file3.ts');
});

test('findFilesRecursively: recursively searches subdirectories', () => {
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
  assertEqual(result.length, 2, 'Should find 2 .vue files including subdirectory');
  assertEqual(result.some(f => f.includes('file1.vue')), true, 'Should include file1.vue');
  assertEqual(result.some(f => f.includes('file2.vue')), true, 'Should include file2.vue from subdir');
});

test('findFilesRecursively: handles errors gracefully', () => {
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
  assertEqual(result.length, 0, 'Should return empty array on error');
});

// Tests for discoverStyleSources
test('discoverStyleSources: discovers CSS and Vue files', () => {
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
  assertEqual(result.length, 4, 'Should discover 4 files total');
  assertEqual(result.some(f => f.includes('global.css')), true, 'Should include global.css');
  assertEqual(result.some(f => f.includes('Button.vue')), true, 'Should include Button.vue');
  assertEqual(result.some(f => f.includes('Input.vue')), true, 'Should include Input.vue');
  assertEqual(result.some(f => f.includes('App.vue')), true, 'Should include App.vue');
});

test('discoverStyleSources: returns sorted results', () => {
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
  assertEqual(result[0].includes('Apple.vue'), true, 'First should be Apple.vue');
  assertEqual(result[1].includes('Banana.vue'), true, 'Second should be Banana.vue');
  assertEqual(result[2].includes('Zebra.vue'), true, 'Third should be Zebra.vue');
});

test('discoverStyleSources: handles missing directories', () => {
  const mockFs: FileSystem = {
    readFile: () => '',
    writeFile: () => {},
    exists: () => false,
    readDir: () => [],
  };
  
  const result = discoverStyleSources('/src', mockFs);
  assertEqual(result.length, 0, 'Should return empty array when directories do not exist');
});

// Test generateStyles with auto-discovery
test('generateStyles: uses auto-discovery when sources not provided', () => {
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
  assertContains(result, '.global { color: red; }');
  assertContains(result, '.button { color: blue; }');
});

// Summary
console.log('\n-------------------');
console.log(`Tests: ${passed + failed} total, ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
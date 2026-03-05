#!/usr/bin/env node

/**
 * Script to generate iframe styles from Vue components and CSS files.
 * This extracts all <style> blocks from Vue components and CSS files,
 * minifies them, and outputs a single string for use in iframe.ts
 *
 * Usage: npx tsx scripts/generate-iframe-styles.ts
 */

import { readFileSync, writeFileSync, existsSync, readdirSync as fsReaddirSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DirEntry {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

/**
 * Recursively find all files matching the given extensions
 */
export function findFilesRecursively(
  dir: string,
  extensions: string[],
  fs: FileSystem = defaultFileSystem
): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readDir(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...findFilesRecursively(fullPath, extensions, fs));
      } else if (entry.isFile()) {
        // Check if file has one of the target extensions
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Discover all style sources automatically
 */
export function discoverStyleSources(srcDir: string, fs: FileSystem = defaultFileSystem): string[] {
  const sources: string[] = [];
  
  // 1. Add global CSS files from styles directory
  const stylesDir = join(srcDir, 'styles');
  if (fs.exists(stylesDir)) {
    const cssFiles = findFilesRecursively(stylesDir, ['.css'], fs);
    cssFiles.forEach(file => {
      sources.push(relative(srcDir, file));
    });
  }
  
  // 2. Add all Vue components from components directory
  const componentsDir = join(srcDir, 'components');
  if (fs.exists(componentsDir)) {
    const vueFiles = findFilesRecursively(componentsDir, ['.vue'], fs);
    vueFiles.forEach(file => {
      sources.push(relative(srcDir, file));
    });
  }
  
  // 3. Add all Vue files from app directory
  const appDir = join(srcDir, 'app');
  if (fs.exists(appDir)) {
    const vueFiles = findFilesRecursively(appDir, ['.vue'], fs);
    vueFiles.forEach(file => {
      sources.push(relative(srcDir, file));
    });
  }
  
  // Sort for consistent output
  return sources.sort();
}

// Legacy: Manual list of files (kept for backward compatibility and testing)
export const STYLE_SOURCES = [
  'styles/global.css',
  'components/BaseButton.vue',
  'components/ConfigSidebar.vue',
  'components/ModelSelector.vue',
  'components/ModelViewer.vue',
  'components/AnimationControls.vue',
  'app/App.vue',
];

/**
 * Extract CSS from Vue component <style> blocks
 */
export function extractStylesFromVue(content: string): string {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styles: string[] = [];
  let match;
  
  while ((match = styleRegex.exec(content)) !== null) {
    styles.push(match[1]);
  }
  
  return styles.join('\n');
}

/**
 * Extract CSS from CSS file (passthrough)
 */
export function extractStylesFromCSS(content: string): string {
  return content;
}

/**
 * Minify CSS by removing comments, extra whitespace, etc.
 */
export function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove newlines and extra spaces
    .replace(/\s+/g, ' ')
    // Remove spaces around special characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Trim
    .trim();
}

/**
 * Escape special characters for template literal
 */
export function escapeForTemplateLiteral(str: string): string {
  return str.replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

export interface FileSystem {
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  exists: (path: string) => boolean;
  readDir: (path: string) => DirEntry[];
}

const defaultFileSystem: FileSystem = {
  readFile: (p) => readFileSync(p, 'utf-8'),
  writeFile: (p, c) => writeFileSync(p, c, 'utf-8'),
  exists: existsSync,
  readDir: (p) => fsReaddirSync(p, { withFileTypes: true }) as DirEntry[],
};

/**
 * Generate combined styles from all source files
 */
export function generateStyles(
  srcDir: string,
  sources?: string[],
  fs: FileSystem = defaultFileSystem
): string {
  // Auto-discover sources if not provided
  const resolvedSources = sources || discoverStyleSources(srcDir, fs);
  
  console.log(`Processing ${resolvedSources.length} source files...`);
  const allStyles: string[] = [];
  
  for (const source of resolvedSources) {
    const filePath = join(srcDir, source);
    
    if (!fs.exists(filePath)) {
      console.warn(`Warning: File not found: ${filePath}`);
      continue;
    }
    
    const content = fs.readFile(filePath);
    let styles: string;
    
    if (source.endsWith('.vue')) {
      styles = extractStylesFromVue(content);
    } else if (source.endsWith('.css')) {
      styles = extractStylesFromCSS(content);
    } else {
      continue;
    }
    
    if (styles.trim()) {
      allStyles.push(`/* ${source} */\n${styles}`);
    }
  }
  
  return allStyles.join('\n\n');
}

/**
 * Generate the output TypeScript file content
 */
export function generateOutputContent(minifiedStyles: string): string {
  return `// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
// Generated by scripts/generate-iframe-styles.ts
// Run: npm run generate:styles

export const IFRAME_STYLES = \`${escapeForTemplateLiteral(minifiedStyles)}\`;
`;
}

export interface GenerateResult {
  rawSize: number;
  minifiedSize: number;
  outputPath: string;
}

/**
 * Main function to run the script
 */
export function main(
  srcDir?: string,
  outputFile?: string,
  fs: FileSystem = defaultFileSystem
): GenerateResult {
  const resolvedSrcDir = srcDir || resolve(__dirname, '../src');
  const resolvedOutputFile = outputFile || resolve(__dirname, '../src/helpers/iframe-styles.generated.ts');
  
  console.log('Generating iframe styles (auto-discovery mode)...');
  
  // Use auto-discovery by passing undefined for sources
  const rawStyles = generateStyles(resolvedSrcDir, undefined, fs);
  const minifiedStyles = minifyCSS(rawStyles);
  const output = generateOutputContent(minifiedStyles);
  
  fs.writeFile(resolvedOutputFile, output);
  
  const result: GenerateResult = {
    rawSize: rawStyles.length,
    minifiedSize: minifiedStyles.length,
    outputPath: resolvedOutputFile,
  };
  
  console.log(`Generated: ${result.outputPath}`);
  console.log(`Original size: ${result.rawSize} bytes`);
  console.log(`Minified size: ${result.minifiedSize} bytes`);
  console.log(`Compression: ${((1 - result.minifiedSize / result.rawSize) * 100).toFixed(1)}%`);
  
  return result;
}

// Run if executed directly (ESM check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MAX_INCLUDE_DEPTH = 10;

/**
 * Parse include statements from content
 * Supports formats:
 * - @file.md
 * - @"file with spaces.md"
 * - @../path/to/file.md
 * - @subdir/file.md
 */
function parseIncludes(content) {
  const includePattern = /@"([^"]+)"|@(\S+)/g;
  const includes = [];
  let match;
  
  while ((match = includePattern.exec(content)) !== null) {
    const includePath = match[1] || match[2];
    includes.push({
      match: match[0],
      path: includePath,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return includes;
}

/**
 * Process includes in content recursively
 * @param {string} content - Content with potential @include statements
 * @param {string} repoRoot - Repository root directory
 * @param {Set} visitedPaths - Set of already processed paths (for circular detection)
 * @param {number} depth - Current recursion depth
 * @returns {string} Content with all includes resolved
 */
function processIncludes(content, repoRoot, visitedPaths = new Set(), depth = 0) {
  if (depth >= MAX_INCLUDE_DEPTH) {
    console.error(`Error: Maximum include depth (${MAX_INCLUDE_DEPTH}) exceeded`);
    process.exit(2);
  }
  
  const includes = parseIncludes(content);
  
  if (includes.length === 0) {
    return content;
  }
  
  // Process includes from end to start to maintain correct indices
  const sortedIncludes = includes.sort((a, b) => b.startIndex - a.startIndex);
  
  let processedContent = content;
  
  for (const include of sortedIncludes) {
    const resolvedPath = path.resolve(repoRoot, include.path);
    
    // Check for circular reference
    if (visitedPaths.has(resolvedPath)) {
      const cycle = Array.from(visitedPaths).concat(resolvedPath);
      console.error(`Error: Circular include detected`);
      console.error(`  Cycle: ${cycle.join(' -> ')}`);
      process.exit(2);
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Include file not found`);
      console.error(`  Reference: ${include.match}`);
      console.error(`  Path: ${include.path}`);
      console.error(`  Resolved to: ${resolvedPath}`);
      process.exit(2);
    }
    
    try {
      // Read the included file
      const includeContent = fs.readFileSync(resolvedPath, 'utf8');
      
      // Create new visited set for this branch
      const newVisitedPaths = new Set(visitedPaths);
      newVisitedPaths.add(resolvedPath);
      
      // Recursively process includes in the included content
      const processedIncludeContent = processIncludes(
        includeContent,
        repoRoot,
        newVisitedPaths,
        depth + 1
      );
      
      // Replace the @include statement with the processed content
      processedContent = 
        processedContent.slice(0, include.startIndex) +
        processedIncludeContent +
        processedContent.slice(include.endIndex);
        
    } catch (err) {
      console.error(`Error reading include file: ${resolvedPath}`);
      console.error(err.message);
      process.exit(2);
    }
  }
  
  return processedContent;
}

/**
 * Main function to process a file with includes
 * @param {string} inputFile - Path to input file
 * @param {string} repoRoot - Repository root directory
 * @returns {string} Processed content
 */
export function processFileWithIncludes(inputFile, repoRoot) {
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(2);
  }
  
  try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const processedContent = processIncludes(content, repoRoot);
    return processedContent;
  } catch (err) {
    console.error(`Error processing file: ${inputFile}`);
    console.error(err.message);
    process.exit(2);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: node process-includes.js <input-file> <repo-root>');
    process.exit(1);
  }
  
  const [inputFile, repoRoot] = args;
  const processedContent = processFileWithIncludes(inputFile, repoRoot);
  console.log(processedContent);
}
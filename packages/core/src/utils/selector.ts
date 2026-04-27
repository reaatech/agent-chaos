import { minimatch } from 'minimatch';

export function matchSelector(toolName: string, selector: string): boolean {
  if (selector === '*') return true;
  if (selector === toolName) return true;
  return minimatch(toolName, selector);
}

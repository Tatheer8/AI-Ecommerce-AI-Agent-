import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

/**
 * Interface representing structured sections of the policy document.
 */
export interface PolicySections {
  raw: string;
  sections: Record<string, string>;
}

/**
 * Resolves the path to the policy file.
 * Defaults to searching for policy.docx, then policy.txt in the project root.
 */
export function resolvePolicyPath(customPath?: string): string {
  if (customPath) {
    const resolved = path.isAbsolute(customPath) ? customPath : path.join(process.cwd(), customPath);
    if (fs.existsSync(resolved)) return resolved;
  }

  const docxCandidate = path.join(process.cwd(), 'policy.docx');
  if (fs.existsSync(docxCandidate)) {
    return docxCandidate;
  }

  const txtCandidate = path.join(process.cwd(), 'policy.txt');
  if (fs.existsSync(txtCandidate)) {
    return txtCandidate;
  }

  throw new Error('Policy document not found. Looked for policy.docx and policy.txt in ' + process.cwd());
}

/**
 * Reads policy document text using Mammoth for .docx files,
 * with fallback to .txt files.
 *
 * @param filePath Optional custom path to policy document
 * @returns The plain text of the policy document
 */
export async function getPolicyText(filePath?: string): Promise<string> {
  const resolvedPath = resolvePolicyPath(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ path: resolvedPath });
    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages.filter((m) => m.type === 'warning');
      if (warnings.length > 0) {
        console.warn('Mammoth warnings during extraction:', warnings);
      }
    }
    return result.value.trim();
  }

  // Fallback to text file
  const content = await fs.promises.readFile(resolvedPath, 'utf-8');
  return content.trim();
}

/**
 * Converts a policy .docx document into clean HTML using Mammoth.
 *
 * @param filePath Optional custom path to policy document
 * @returns HTML string representation of the policy
 */
export async function getPolicyHtml(filePath?: string): Promise<string> {
  const resolvedPath = resolvePolicyPath(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.convertToHtml({ path: resolvedPath });
    return result.value;
  }

  const text = await fs.promises.readFile(resolvedPath, 'utf-8');
  return `<pre>${text}</pre>`;
}

/**
 * Parses policy text into labeled sections (e.g., RETURN POLICY, SHIPPING POLICY).
 * Useful for RAG or prompt context injection in the AI ecommerce agent.
 */
export async function getParsedPolicy(filePath?: string): Promise<PolicySections> {
  const raw = await getPolicyText(filePath);
  const lines = raw.split(/\r?\n/);
  const sections: Record<string, string> = {};
  let currentHeader = 'GENERAL';
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Headers are typically all caps lines like RETURN POLICY, REFUND POLICY
    if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && !trimmed.includes(':') && !trimmed.includes('$')) {
      if (currentContent.length > 0) {
        sections[currentHeader] = currentContent.join('\n').trim();
      }
      currentHeader = trimmed;
      currentContent = [];
    } else if (trimmed.length > 0) {
      currentContent.push(trimmed);
    }
  }

  if (currentContent.length > 0) {
    sections[currentHeader] = currentContent.join('\n').trim();
  }

  return {
    raw,
    sections,
  };
}


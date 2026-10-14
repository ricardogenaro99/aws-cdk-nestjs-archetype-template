import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Genaryth Autonomous Squad Framework (GASF v2.0)
 * Local Project Harness Enforcer
 *
 * Ejecuta validaciones de seguridad, límites arquitectónicos y git-antichancado
 * directamente en la raíz de cualquier proyecto del ecosistema Genaryth.
 */

// 1. Patrones de secretos estáticos (ignora placeholders de ejemplo como 'ghp_xxxx' o 'sk-xxxx')
const SECRET_PATTERNS = [
  { 
    name: 'AWS Access Key ID', 
    pattern: /\bAKIA[0-9A-Z]{16}\b/ 
  },
  { 
    name: 'API Key (OpenAI, Anthropic, Stripe)', 
    pattern: /\b(?:sk-[a-zA-Z0-9_-]{20,}|sk_live_[a-zA-Z0-9]{24,})\b/,
    isFalsePositive: (match) => /^[a-zA-Z0-9_-]*x{4,}[a-zA-Z0-9_-]*$/i.test(match) || match.includes('sk-ant-api03-xxxx')
  },
  { 
    name: 'GitHub Personal Access Token', 
    pattern: /\bghp_[a-zA-Z0-9]{20,}\b/,
    isFalsePositive: (match) => /^ghp_x+$/i.test(match) || match.includes('xxxxxxxxxx')
  },
  { 
    name: 'Hardcoded JWT', 
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
    isFalsePositive: (match) => match.includes('eyJxxx') || match.includes('xxxxxxxx')
  },
  { 
    name: 'Hardcoded Private Key', 
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    isFalsePositive: () => false
  },
  { 
    name: 'Database URI with Credentials', 
    pattern: /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/,
    isFalsePositive: (match) => match.includes('user:password@localhost') || match.includes('user:pass@')
  }
];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'cdk.out',
  'coverage',
  '.turbo'
]);

const SCANNABLE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.json',
  '.env',
  '.yml',
  '.yaml',
  '.sql'
]);

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
    return output.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function getAllTrackedFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTrackedFiles(fullPath, fileList);
    } else {
      const ext = path.extname(entry.name);
      if (SCANNABLE_EXTS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function runAudit({ stagedOnly = false } = {}) {
  const rootDir = process.cwd();
  console.log('\x1b[1m\x1b[36m%s\x1b[0m', '🛡️  [GENARYTH LOCAL HARNESS] Verificando integridad de repositorio...');

  let filesToScan = [];
  if (stagedOnly) {
    const staged = getStagedFiles();
    if (staged.length === 0) {
      console.log('   ℹ️  No hay archivos en staging para auditar.');
      return true;
    }
    filesToScan = staged.map(f => path.join(rootDir, f)).filter(f => fs.existsSync(f));
    console.log(`   Auditoría de pre-commit sobre ${filesToScan.length} archivo(s) en staging.`);
  } else {
    filesToScan = getAllTrackedFiles(rootDir);
    console.log(`   Auditoría de workspace completa sobre ${filesToScan.length} archivo(s).`);
  }

  const violations = [];

  for (const filePath of filesToScan) {
    const relPath = path.relative(rootDir, filePath);
    // Ignorar lockfiles o minificados
    if (relPath.endsWith('pnpm-lock.yaml') || relPath.endsWith('package-lock.json')) continue;

    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // A. Escaneo de secretos
    for (const sec of SECRET_PATTERNS) {
      const match = content.match(sec.pattern);
      if (match) {
        const rawMatchedString = match[0];
        if (sec.isFalsePositive && sec.isFalsePositive(rawMatchedString)) {
          // Placeholder de UI o documentación, permitido
          continue;
        }
        violations.push({
          file: relPath,
          category: 'SECRET_LEAK',
          rule: sec.name,
          message: `Detectado potencial secreto hardcodeado (${sec.name}).`
        });
      }
    }

    // B. Hexagonal Boundary (dominio puro no debe importar infraestructura)
    if (relPath.includes('/domain/') || relPath.includes('/entities/')) {
      const badImports = ['@nestjs/', '@prisma/client', 'typeorm', 'express', 'fastify'];
      for (const imp of badImports) {
        if (content.includes(`from '${imp}`) || content.includes(`from "${imp}`)) {
          violations.push({
            file: relPath,
            category: 'ARCHITECTURAL_BOUNDARY',
            rule: `HEXAGONAL_PURITY:${imp}`,
            message: `Módulo de dominio puro no debe importar infraestructura (${imp}).`
          });
        }
      }
    }

    // C. Anti-Any en DTOs y Contratos
    if (relPath.endsWith('.dto.ts') || relPath.endsWith('.contract.ts')) {
      if (/(:\s*any\b|<any>|\bas\s+any\b)/.test(content)) {
        violations.push({
          file: relPath,
          category: 'TYPE_SAFETY',
          rule: 'NO_ANY_IN_DTOS',
          message: `Uso no autorizado de tipo 'any' en contrato DTO.`
        });
      }
    }

    // D. React Server Component boundary check
    if ((relPath.includes('/app/') && (relPath.endsWith('page.tsx') || relPath.endsWith('layout.tsx'))) && !content.includes("'use client'")) {
      const clientHooks = ['useState', 'useEffect', 'useLayoutEffect', 'useReducer'];
      for (const hook of clientHooks) {
        if (new RegExp(`\\b${hook}\\s*\\(`).test(content)) {
          violations.push({
            file: relPath,
            category: 'ARCHITECTURAL_BOUNDARY',
            rule: 'RSC_CLIENT_HOOK_LEAK',
            message: `Server Component invoca '${hook}'. Extrae a Client Island ('use client').`
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n\x1b[1m\x1b[31m%s\x1b[0m', `❌ [LOCAL HARNESS VIOLATIONS]: Encontradas ${violations.length} violación(es) de guardrail:`);
    for (const v of violations) {
      console.error(`   • [${v.category}] ${v.file}: ${v.message} (\x1b[33m${v.rule}\x1b[0m)`);
    }
    console.error('\n\x1b[31m%s\x1b[0m', 'Corrige las infracciones anteriores para cumplir con la directiva ADR-011 de Genaryth.');
    return false;
  }

  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '✅ [LOCAL HARNESS PASSED]: Cero fugas de secretos y límites arquitectónicos respetados.\n');
  return true;
}

const isStagedOnly = process.argv.includes('--staged');
const passed = runAudit({ stagedOnly: isStagedOnly });
process.exit(passed ? 0 : 1);

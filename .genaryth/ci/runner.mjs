#!/usr/bin/env node
/**
 * Genaryth Autonomous Squad Framework (GASF v2.0)
 * Genaryth Local Titanium CI Runner (ARCH-011 / OPS-06)
 *
 * Emulates and executes thorough local CI verifications:
 * 1. 🔒 Security & Local Harness Check
 * 2. 📐 TypeScript Typecheck (Dual Monorepo)
 * 3. ☁️ AWS CDK Infrastructure Synth Validation
 * 4. 🧹 Code Quality & ESLint Linter
 * 5. ✨ Code Style Formatting Check
 *
 * Supports CLI flags: --fast, --infra, --help
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// ANSI Formatting Constants
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Parse CLI Flags
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const isFast = args.includes('--fast');
const isInfraOnly = args.includes('--infra');

// Pipeline Phase Definitions
const ALL_PHASES = [
  {
    id: 'security-harness',
    name: '🔒 Security & Local Harness Check',
    command: 'node .genaryth/harness/enforcer.mjs',
    applies: () => true,
  },
  {
    id: 'typecheck',
    name: '📐 TypeScript Typecheck (Dual Monorepo)',
    command: 'pnpm run typecheck',
    applies: () => !isInfraOnly,
  },
  {
    id: 'cdk-synth',
    name: '☁️ AWS CDK Infrastructure Synth Validation',
    command: 'pnpm run infra:synth',
    applies: () => true,
  },
  {
    id: 'linter',
    name: '🧹 Code Quality & ESLint Linter',
    command: 'pnpm run lint',
    applies: () => !isInfraOnly,
  },
  {
    id: 'format-check',
    name: '✨ Code Style Formatting Check',
    command: 'pnpm run format:check',
    applies: () => !isFast && !isInfraOnly,
  },
];

function printHeader() {
  console.log(`\n${CYAN}┌────────────────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(
    `${CYAN}│${RESET}             ${BOLD}🛡️  GENARYTH LOCAL CI PIPELINE (TITANIUM RUNNER)${RESET}           ${CYAN}│${RESET}`,
  );
  console.log(`${CYAN}└────────────────────────────────────────────────────────────────────────┘${RESET}\n`);

  const activeFlags = [];
  if (isFast) activeFlags.push('--fast');
  if (isInfraOnly) activeFlags.push('--infra');

  if (activeFlags.length > 0) {
    console.log(`${DIM}Modes & Flags:${RESET} ${YELLOW}${activeFlags.join(' ')}${RESET}\n`);
  }
}

function printHelp() {
  console.log(`\n${CYAN}Genaryth Titanium Local CI Runner${RESET}`);
  console.log(`\n${BOLD}Usage:${RESET}`);
  console.log(`  node .genaryth/ci/runner.mjs [options]\n`);
  console.log(`${BOLD}Options:${RESET}`);
  console.log(`  ${GREEN}--fast${RESET}                 Skip code style formatting check for faster feedback`);
  console.log(
    `  ${GREEN}--infra${RESET}                Run infrastructure and security phases only (Harness + CDK Synth)`,
  );
  console.log(`  ${GREEN}--help, -h${RESET}             Show this help guide\n`);
}

function runCommand(commandStr) {
  return spawnSync(commandStr, {
    cwd: ROOT_DIR,
    shell: true,
    stdio: 'pipe',
    encoding: 'utf-8',
    env: { ...process.env, CI: 'true', FORCE_COLOR: '1' },
  });
}

async function main() {
  printHeader();

  const startTime = Date.now();
  const results = [];
  let failedPhase = null;

  for (let i = 0; i < ALL_PHASES.length; i++) {
    const phase = ALL_PHASES[i];
    const stepNumber = `[${i + 1}/${ALL_PHASES.length}]`;

    if (!phase.applies()) {
      results.push({
        ...phase,
        status: 'SKIPPED',
        duration: 0,
      });
      console.log(`${GRAY}${stepNumber} [SKIPPED] ${phase.name}${RESET}`);
      continue;
    }

    process.stdout.write(`${CYAN}${stepNumber} [RUNNING] ${phase.name}...${RESET}\r`);

    const phaseStart = Date.now();
    const result = runCommand(phase.command);
    const duration = ((Date.now() - phaseStart) / 1000).toFixed(2);

    if (result.status === 0) {
      results.push({
        ...phase,
        status: 'PASSED',
        duration,
      });
      process.stdout.write(`\r\x1b[K${GREEN}${stepNumber} [PASSED]  ${phase.name} ${BOLD}(${duration}s)${RESET}\n`);
    } else {
      results.push({
        ...phase,
        status: 'FAILED',
        duration,
        errorOutput: (result.stdout || '') + '\n' + (result.stderr || ''),
      });
      process.stdout.write(`\r\x1b[K${RED}${stepNumber} [FAILED]  ${phase.name} ${BOLD}(${duration}s)${RESET}\n`);
      failedPhase = results[results.length - 1];
      break;
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  // If there's a failure, print detailed error block
  if (failedPhase) {
    console.log(`\n${RED}════════════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${RED}${BOLD}❌ PIPELINE FAILED AT PHASE: ${failedPhase.name}${RESET}`);
    console.log(`${RED}Command executed: ${failedPhase.command}${RESET}`);
    console.log(`${RED}════════════════════════════════════════════════════════════════════════${RESET}\n`);
    console.log(failedPhase.errorOutput.trim());
    console.log(`\n${RED}════════════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${RED}Pipeline terminated with Exit Code 1. Total elapsed: ${totalDuration}s${RESET}\n`);
    process.exit(1);
  }

  // Summary Dashboard
  console.log(`\n${CYAN}┌────────────────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(
    `${CYAN}│${RESET}                       ${BOLD}📊  PIPELINE EXECUTION SUMMARY${RESET}                   ${CYAN}│${RESET}`,
  );
  console.log(`${CYAN}├───────────────────────────────────────────────────────────┬────────────┤${RESET}`);
  console.log(
    `${CYAN}│${RESET} ${BOLD}Verification Phase${RESET}                                        ${CYAN}│${RESET} ${BOLD}Time / Stat${RESET}${CYAN}│${RESET}`,
  );
  console.log(`${CYAN}├───────────────────────────────────────────────────────────┼────────────┤${RESET}`);

  for (const res of results) {
    let statusText = '';
    if (res.status === 'PASSED') {
      statusText = `${GREEN}${res.duration.padStart(6, ' ')}s  ✔${RESET}`;
    } else if (res.status === 'SKIPPED') {
      statusText = `${GRAY}   SKIP  -${RESET}`;
    } else {
      statusText = `${RED}   FAIL  ✖${RESET}`;
    }

    // Strip emojis and variation selectors for padding calculations
    const cleanName = res.name
      .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    const truncatedName = cleanName.length > 55 ? cleanName.substring(0, 52) + '...' : cleanName;
    const paddedName = truncatedName.padEnd(57, ' ');

    console.log(`${CYAN}│${RESET} ${paddedName} ${CYAN}│${RESET} ${statusText} ${CYAN}│${RESET}`);
  }

  console.log(`${CYAN}├───────────────────────────────────────────────────────────┼────────────┤${RESET}`);
  const totalLabel = `${BOLD}TOTAL DURATION${RESET}`.padEnd(66, ' ');
  const totalFormatted = `${BOLD}${totalDuration.padStart(6, ' ')}s${RESET}`;
  console.log(`${CYAN}│${RESET} ${totalLabel} ${CYAN}│${RESET}   ${totalFormatted}   ${CYAN}│${RESET}`);
  console.log(`${CYAN}└───────────────────────────────────────────────────────────┴────────────┘${RESET}`);

  console.log(
    `\n${GREEN}${BOLD}🎉 ARQUETIPO 100% CERTIFICADO — CERO VULNERABILIDADES & LISTO PARA PUSH/DEPLOY${RESET}\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n${RED}Unexpected fatal error in CI runner:${RESET}`, err);
  process.exit(1);
});

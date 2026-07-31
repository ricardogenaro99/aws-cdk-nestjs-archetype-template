import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const rootDir = __dirname;
const envPath = path.join(rootDir, '.env');

// 1. Cargar .env si existe en la raíz
if (fs.existsSync(envPath)) {
  console.log('✅ [CDK-Launcher] Cargando credenciales locales desde .env de la raíz...');
  dotenv.config({ path: envPath });
} else {
  console.log('ℹ️ [CDK-Launcher] .env no encontrado en la raíz. Usando credenciales globales de AWS...');
}

// 2. Obtener los argumentos de la línea de comandos
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: Se requiere un comando de CDK (ej: deploy, synth, diff, destroy)');
  process.exit(1);
}

// Determinar el comando ejecutable de npx según la plataforma
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const finalArgs = ['cdk', ...args];

console.log(`🚀 Ejecutando: npx cdk ${args.join(' ')}\n`);

// 3. Levantar CDK inyectando process.env (con el .env ya cargado)
const cdkProcess = spawn(npxCommand, finalArgs, {
  cwd: path.join(rootDir, 'infrastructure'),
  env: {
    ...process.env,
  },
  stdio: 'inherit',
});

cdkProcess.on('close', (code) => {
  process.exit(code ?? 0);
});

import fs from 'fs-extra';
import path from 'path';

interface PackageJson {
  name: string;
  version: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function getPackage(): Promise<PackageJson> {
  return await fs.readJSON(path.join(__dirname, 'package.json'));
}

async function savePackageJson(outDir: string, packageData: PackageJson): Promise<void> {
  const targetFile = path.join(__dirname, outDir, 'package.json');
  await fs.writeJSON(targetFile, packageData, { spaces: 2 });
  console.log(`✅ El 'package.json' copiado en '${targetFile}'`);
}

async function cleanPrismaClient(prismaDestClientDir: string): Promise<void> {
  if (!(await fs.pathExists(prismaDestClientDir))) {
    return;
  }

  const files = await fs.readdir(prismaDestClientDir);
  for (const file of files) {
    const filePath = path.join(prismaDestClientDir, file);

    // 1. Eliminar copias duplicadas numeradas generadas por el OS o sync de iCloud (ej: "default 2.js", "libquery_engine 2.node")
    if (/\s\d+\./.test(file)) {
      await fs.remove(filePath);
      console.log(`🗑️ Eliminado duplicado numerado: ${file}`);
      continue;
    }

    // 2. Eliminar motores y binarios de desarrollo local (Darwin/macOS y Windows), reteniendo únicamente el motor Linux Lambda
    // Mantener libquery_engine-rhel-openssl-3.0.x.so.node (necesario para runtime Amazon Linux / Lambda)
    const isLocalDevEngine =
      file.includes('darwin') || file.endsWith('.dylib.node') || file.endsWith('.exe') || file.includes('windows');

    const isLambdaLinuxEngine = file.includes('rhel-openssl-3.0.x.so.node');

    if (file.includes('query_engine') && isLocalDevEngine && !isLambdaLinuxEngine) {
      await fs.remove(filePath);
      console.log(`🗑️ Eliminado binario de desarrollo local: ${file}`);
    }
  }
}

async function prepareBuild() {
  const OUT_DIR = 'app';
  const outDirPath = path.join(__dirname, OUT_DIR);

  const packageData = await getPackage();

  // Filtrar dependencias innecesarias o locales en producción (Lambda)
  if (packageData.dependencies) {
    for (const [dep, version] of Object.entries(packageData.dependencies)) {
      if (
        dep.startsWith('@aws-sdk/') ||
        dep === 'aws-sdk' ||
        dep === 'aws-lambda' ||
        dep === 'express' ||
        version.startsWith('workspace:')
      ) {
        delete packageData.dependencies[dep];
      }
    }
  }

  packageData.devDependencies = {};
  packageData.scripts = {
    'package:install': 'npm install --omit=dev --no-audit --no-fund --ignore-scripts',
  };

  // Asegurar que el directorio app/ exista
  await fs.ensureDir(outDirPath);

  // 1. Purga automática de lockfiles duplicados o numerados acumulados ("package-lock *.json", "pnpm-lock.yaml", etc.)
  await fs.remove(path.join(outDirPath, 'pnpm-lock.yaml'));
  await fs.remove(path.join(outDirPath, 'package-lock.json'));

  const filesInApp = await fs.readdir(outDirPath);
  for (const file of filesInApp) {
    // Purga de archivos o carpetas duplicadas acumuladas (ej: "package-lock 2.json", "node_modules 2")
    if (
      (file.startsWith('package-lock') && file.endsWith('.json')) ||
      (file.startsWith('pnpm-lock') && file.endsWith('.yaml')) ||
      /\s\d+$/.test(file) ||
      /\s\d+\./.test(file)
    ) {
      await fs.remove(path.join(outDirPath, file));
      console.log(`🗑️ Purgado archivo/directorio duplicado: ${file}`);
    }
  }

  // 2. Limpieza y desaprovisionamiento de binarios/motores de desarrollo local en node_modules/.prisma/client si existe
  const prismaDestClientDir = path.join(outDirPath, 'node_modules/.prisma/client');
  await cleanPrismaClient(prismaDestClientDir);

  await savePackageJson(OUT_DIR, packageData);
}

prepareBuild()
  .catch((error) =>
    console.error('❌ Error durante la preparación de la construcción:', JSON.stringify(error, null, 2)),
  )
  .then(() => console.log('✅ Se preparó el directorio app/ correctamente'));

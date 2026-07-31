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

async function prepareBuild() {
  const OUT_DIR = 'app';

  const packageData = await getPackage();

  // Filtrar dependencias innecesarias en producción (Lambda)
  if (packageData.dependencies) {
    for (const dep of Object.keys(packageData.dependencies)) {
      if (dep.startsWith('@aws-sdk/') || dep === 'aws-sdk' || dep === 'aws-lambda' || dep === 'express') {
        delete packageData.dependencies[dep];
      }
    }
  }

  packageData.devDependencies = {};
  packageData.scripts = {
    'package:install': 'npm install --omit=dev --no-audit --no-fund --ignore-scripts',
  };

  // Ensure output directory exists
  await fs.ensureDir(path.join(__dirname, OUT_DIR));

  // Delete existing lockfiles in app folder
  await fs.remove(path.join(__dirname, OUT_DIR, 'pnpm-lock.yaml'));
  await fs.remove(path.join(__dirname, OUT_DIR, 'package-lock.json'));

  await savePackageJson(OUT_DIR, packageData);
}

prepareBuild()
  .catch((error) =>
    console.error('❌ Error durante la preparación de la construcción:', JSON.stringify(error, null, 2)),
  )
  .then(() => console.log('✅ Se preparó el directorio app/ correctamente'));

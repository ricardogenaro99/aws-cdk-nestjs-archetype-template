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

async function copyNpmrc(outDir: string): Promise<void> {
  const file = '.npmrc';
  const sourcePath = path.join(__dirname, file);
  const targetPath = path.join(__dirname, outDir, file);

  const exists = await fs.pathExists(sourcePath);

  if (exists) {
    await fs.copy(sourcePath, targetPath);
    console.log(`✅ '${file}' copiado a '${outDir}'`);
  } else {
    console.log(`ℹ️ '${file}' no encontrado en el root`);
  }
}

async function savePackageJson(outDir: string, packageData: PackageJson): Promise<void> {
  const targetFile = path.join(__dirname, outDir, 'package.json');
  await fs.writeJSON(targetFile, packageData, { spaces: 2 });
  console.log(`✅ El 'package.json' copiado en '${targetFile}'`);
}

async function prepareBuild() {
  const OUT_DIR = 'app';

  const packageData = await getPackage();
  packageData.devDependencies = {};
  packageData.scripts = {
    'package:install': 'pnpm install --prod --ignore-workspace --ignore-scripts --no-frozen-lockfile',
  };

  // Ensure output directory exists
  await fs.ensureDir(path.join(__dirname, OUT_DIR));

  await savePackageJson(OUT_DIR, packageData);
  await copyNpmrc(OUT_DIR);
}

prepareBuild()
  .catch((error) =>
    console.error('❌ Error durante la preparación de la construcción:', JSON.stringify(error, null, 2)),
  )
  .then(() => console.log('✅ Se preparó el directorio app/ correctamente'));

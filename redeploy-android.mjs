import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const androidDir = path.join(repoRoot, 'android');
const localPropertiesPath = path.join(androidDir, 'local.properties');
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const packageName = 'com.askamo.mobile';
const generatedCordovaGradlePath = path.join(androidDir, 'capacitor-cordova-android-plugins', 'build.gradle');

function run(command, args, options = {}) {
  const baseOptions = {
    stdio: 'inherit',
    cwd: repoRoot,
    ...options,
  };

  const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
  const result = isWindowsScript
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${command} ${args.map(quoteArg).join(' ')}`], baseOptions)
    : spawnSync(command, args, baseOptions);

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function quoteArg(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function getAdbPath() {
  if (fs.existsSync(localPropertiesPath)) {
    const localProperties = fs.readFileSync(localPropertiesPath, 'utf8');
    const sdkLine = localProperties
      .split(/\r?\n/)
      .find((line) => line.startsWith('sdk.dir='));

    if (sdkLine) {
      const sdkDir = sdkLine
        .slice('sdk.dir='.length)
        .replace(/\\:/g, ':')
        .replace(/\\\\/g, '\\');
      const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
      const adbPath = path.join(sdkDir, 'platform-tools', adbName);

      if (fs.existsSync(adbPath)) {
        return adbPath;
      }
    }
  }

  return process.platform === 'win32' ? 'adb.exe' : 'adb';
}

function getGradleCommand() {
  return process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
}

function getWirelessDeviceSerial(adbPath) {
  const result = spawnSync(adbPath, ['devices'], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to query adb devices.');
  }

  const serial = result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Find the last occurrence of 'device', 'offline', etc.
      // The serial is everything before the status word.
      const match = line.match(/^(.*)\s+(device|offline|unauthorized|recovery|sideload|bootloader|unauthorized)$/);
      return match ? match[1].trim() : line.split(/\s+/)[0];
    })
    .find((entry) => entry.includes('_adb-tls-connect._tcp') || entry.includes(':5555'));

  if (!serial) {
    throw new Error('No wireless ADB device found. Connect the device first, then retry.');
  }

  return serial;
}

function sanitizeGeneratedGradleFiles() {
  if (!fs.existsSync(generatedCordovaGradlePath)) {
    return;
  }

  const original = fs.readFileSync(generatedCordovaGradlePath, 'utf8');
  const sanitized = original
    .replace(/\n\s*repositories \{\n\s*google\(\)\n\s*mavenCentral\(\)\n\s*flatDir\{\n\s*dirs 'src\/main\/libs', 'libs'\n\s*\}\n\s*\}\n/g, "\nrepositories {\n    google()\n    mavenCentral()\n}\n")
    .replace(/\n\s*implementation fileTree\(dir: 'src\/main\/libs', include: \['\*\.jar'\]\)\n/g, '\n')
    .replace("minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24", "minSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24")
    .replace("targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36", "targetSdkVersion = project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36")
    .replace('versionCode 1', 'versionCode = 1')
    .replace('versionName "1.0"', 'versionName = "1.0"')
    .replace('sourceCompatibility JavaVersion.VERSION_21', 'sourceCompatibility = JavaVersion.VERSION_21')
    .replace('targetCompatibility JavaVersion.VERSION_21', 'targetCompatibility = JavaVersion.VERSION_21');

  if (sanitized !== original) {
    fs.writeFileSync(generatedCordovaGradlePath, sanitized, 'utf8');
    console.log('Sanitized generated Capacitor Gradle warnings.');
  }
}

const adbPath = getAdbPath();
const gradleCommand = getGradleCommand();
const npmCommand = getNpmCommand();
const npxCommand = getNpxCommand();

console.log('Building web app...');
run(npmCommand, ['run', 'build']);

console.log('Syncing Capacitor Android project...');
    run('node', [path.join(repoRoot, 'node_modules', '@capacitor', 'assets', 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor'), 'sync']);
sanitizeGeneratedGradleFiles();

console.log('Assembling debug APK...');
run(gradleCommand, ['assembleDebug'], { cwd: androidDir });

const deviceSerial = getWirelessDeviceSerial(adbPath);
console.log(`Installing to ${deviceSerial}...`);
run(adbPath, ['-s', deviceSerial, 'install', '-r', apkPath]);

console.log('Launching app...');
run(adbPath, ['-s', deviceSerial, 'shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);

console.log('Wireless redeploy complete.');

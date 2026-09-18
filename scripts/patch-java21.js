const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'node_modules', '@react-native', 'gradle-plugin'),
  path.join(root, 'node_modules', 'react-native', 'ReactAndroid'),
  path.join(root, 'node_modules', 'react-native-reanimated', 'android'),
  path.join(root, 'node_modules', 'react-native-worklets', 'android'),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else if (entry.isFile() && (file.endsWith('.gradle.kts') || file.endsWith('.kt'))) out.push(file);
  }
  return out;
}

let changed = 0;
for (const file of targets.flatMap(walk)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replace(/jvmToolchain\\(17\\)/g, 'jvmToolchain(21)')
    .replace(/JavaVersion\\.VERSION_17/g, 'JavaVersion.VERSION_21')
    .replace(/JvmTarget\\.JVM_17/g, 'JvmTarget.JVM_21')
    .replace(/fromTarget\\(["']17["']\\)/g, 'fromTarget("21")');
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
  }
}

console.log(changed ? `Java 21 toolchain compatibility patch applied to ${changed} file(s).` : 'Java 21 toolchain compatibility patch already applied or no matching files found.');

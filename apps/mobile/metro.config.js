const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');
// Source packages currently live in the repository root (src/).
// Watch them explicitly for Metro resolution in npm workspace installs.
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));
config.resolver.nodeModulesPaths = Array.from(new Set([
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...(config.resolver.nodeModulesPaths || []),
]));

module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');
// Expo SDK 54 automatically configures Metro for npm workspaces.
module.exports = getDefaultConfig(__dirname);

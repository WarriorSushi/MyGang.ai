const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// In a pnpm monorepo, both apps/mobile and the workspace root can end up with
// their own node_modules/react. Even at the same version, two physical React
// instances share no internal singleton state — React hooks throw "Cannot read
// property 'useState' of null". Force every "react"/"react-dom" import to
// resolve to the single hoisted copy at the workspace root.
const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so Metro picks up changes in packages/shared.
config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), workspaceRoot]),
);

// Resolve modules from BOTH the project's and the workspace's node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force React (and react-dom, which RN occasionally pulls in indirectly) to
// resolve to one canonical location — the workspace root. This is the fix for
// the "two Reacts → null dispatcher" hook crash.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(workspaceRoot, "node_modules/react"),
  "react-dom": path.resolve(workspaceRoot, "node_modules/react-dom"),
};

module.exports = withNativeWind(config, { input: "./global.css" });

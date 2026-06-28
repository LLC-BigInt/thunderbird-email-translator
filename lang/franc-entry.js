// esbuild entry: bundles the franc npm package into a single ESM file the
// extension can import (extensions can't resolve node_modules at runtime).
export { franc, francAll } from "franc";

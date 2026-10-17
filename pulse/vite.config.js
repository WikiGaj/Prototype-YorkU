import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Default (Bolt) deploys at root '/'.
// The York U Fitness class variant (mode "yorku") deploys to /pulse/yorku/.
// GitHub Pages deployments use mode "github" to set the book repo subpath.
export default defineConfig(({ mode }) => {
  const isYorku = mode === 'yorku';
  const isGithub = mode === 'github';

  let base = '/';
  let outDir = 'dist';

  if (isGithub) {
    base = '/book-pm-management/pulse/';
    outDir = 'dist/pulse';
  } else if (isYorku) {
    base = '/pulse/yorku/';
    outDir = 'dist/pulse/yorku';
  }

  return {
    plugins: [react()],
    base,
    build: {
      outDir,
      emptyOutDir: true,
    },
  };
});

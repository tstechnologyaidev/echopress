import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        about: path.resolve(__dirname, 'about.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        article: path.resolve(__dirname, 'article.html'),
        login: path.resolve(__dirname, 'login.html'),
        journalist: path.resolve(__dirname, 'journalist.html'),
        'journalist-editor': path.resolve(__dirname, 'journalist-editor.html'),
        archives: path.resolve(__dirname, 'archives.html'),
      }
    }
  }
});

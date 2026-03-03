import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                login: 'login.html',
                client: 'client.html'
            }
        }
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3000'
        }
    }
});

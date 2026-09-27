import path from 'node:path';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
export default defineConfig({
 resolve:{alias:{'@':path.resolve(__dirname,'src')},extensions:[".mjs", ".ts", ".tsx", ".js", ".jsx", ".json"]},
 plugins:[react()],server:{proxy:{'/api':{target:'http://localhost:8787',changeOrigin:true}}},
 build:{rollupOptions:{output:{manualChunks(id){if(/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'vendor-react';}}}}
});

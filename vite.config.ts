import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import preact from '@preact/preset-vite'

export default defineConfig({
    base: '/zen-outliner/',
    plugins: [preact(), tailwindcss()],
})

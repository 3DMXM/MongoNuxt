<script setup>
import { useColorMode } from "@vueuse/core";

const mode = useColorMode();

mode.value = "dark";

// Global meta
useHead({
    title: "MongoDB 管理器",
    meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "现代化的 MongoDB 数据库管理工具" },
    ],
    link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
});
</script>
<template>
    <div id="app">
        <UApp>
            <NuxtPage />
        </UApp>
    </div>
</template>

<style>
/* Import Google Fonts */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap");

/* Global font settings */
html {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        sans-serif;
}

/* Code font */
pre,
code {
    font-family: "Fira Code", "Consolas", "Monaco", "Courier New", monospace !important;
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background-color: #f3f4f6;
}

.dark ::-webkit-scrollbar-track {
    background-color: #1f2937;
}

::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 0.5rem;
}

.dark ::-webkit-scrollbar-thumb {
    background-color: #4b5563;
}

::-webkit-scrollbar-thumb:hover {
    background-color: #9ca3af;
}

.dark ::-webkit-scrollbar-thumb:hover {
    background-color: #6b7280;
}

/* Animation for fade-in effect */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in {
    animation: fadeIn 0.3s ease-out;
}

/* Smooth transitions */
* {
    transition: color 0.2s ease, background-color 0.2s ease,
        border-color 0.2s ease;
}
</style>

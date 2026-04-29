/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {},
    },
    content: [
        "./project_templates/**/*.html",
        "./**/templates/**/*.html",
    ],
    plugins: [require("@tailwindcss/forms")],
}
// https://tomdekan.com/articles/tailwind-with-django?ref=rdjango-tailwind-with-django
module.exports = {
    purge: [
        './_includes/**/*.html',
        './_layouts/**/*.html',
        './_posts/*.md',
        './*.html',
    ],
    darkMode: 'media',
    theme: {
        extend: {},
    },
    variants: {},
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
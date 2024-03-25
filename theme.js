// It's best to inline this in `head` to avoid FOUC (flash of unstyled content) when changing pages or themes
const storedTheme = localStorage.getItem('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: Dark)').matches ? 'Dark' : 'Light';

if (storedTheme === 'Dark' || (storedTheme === 'system' && systemTheme === 'Dark')) {
  document.documentElement.classList.add('dark');
  console.log('Dark mode enabled', storedTheme);
} else {
  document.documentElement.classList.remove('dark');
  console.log('Dark mode disabled', storedTheme);
}

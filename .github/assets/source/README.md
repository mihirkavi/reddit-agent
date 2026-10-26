# Banner source

`banner.html` is the self-contained design for `../banner-light.png` and `../banner-dark.png`. One file holds both themes: its `@media (prefers-color-scheme: dark)` block switches the palette.

## Re-render

Render it with any headless Chrome at a 1600 × 600 viewport and device scale factor 2, once with `prefers-color-scheme: light` and once with `dark`. For example, with Playwright:

```js
const page = await browser.newPage({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 2, colorScheme: 'dark' });
await page.goto('file://' + path.resolve('.github/assets/source/banner.html'));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: '.github/assets/banner-dark.png' });
```

Fonts load from Google Fonts, so rendering needs network access. The logo is read from `assets/brand/logo.png` by relative path, so render the file from inside this repository.

## Notes for agents

- Edit the HTML, then re-render both PNGs. Never edit the PNGs by hand.
- Keep the banner free of personal data, real account content, tokens and invented product output.
- The comment thread and source list are abstract placeholders (grey bars, `…` paths), not real Reddit posts or usernames. Keep them that way.

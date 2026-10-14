# Copy button

`glass-ux/copy-button` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Copies a value and confirms in place: the icon becomes a drawn ✓ for the feedback hold, or ✕ when
the clipboard refuses, and a polite live region says "Copied". The button never changes size.
Inside an Input's box give it `className="fa-input-btn"`; the IP, MAC, phone, coordinates and
password controls already do.

```tsx
<CopyButton value="+61412345678" label="Copy number" />
<Input readOnly value={ip} trailing={<CopyButton value={ip} label="Copy address" className="fa-input-btn" />} />
```

`value` may be a function (read when pressed). `copyText(text)` is the clipboard call on its own.

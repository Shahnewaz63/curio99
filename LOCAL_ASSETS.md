# Local VSCode Assets

For local VSCode development, copy the original WhatsApp logo to:

```text
client/public/images/whatsapp-footer-icon-round.png
```

Then use this source in `client/src/pages/Home.tsx`:

```tsx
<img
  src="/images/whatsapp-footer-icon-round.png"
  alt="WhatsApp"
  className="h-[18px] w-[18px] shrink-0 object-contain"
/>
```

The deployed Curio project instead uses the hosted asset path:

```text
/manus-storage/whatsapp-footer-icon-round_167860f8.png
```

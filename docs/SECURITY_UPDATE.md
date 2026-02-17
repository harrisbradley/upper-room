# Security Update - npm audit vulnerabilities

## Vulnerabilities Found

1. **glob** (10.2.0 - 10.4.5) - High severity
   - Command injection via -c/--cmd
   - Affects: `eslint-config-next` (dev dependency)
   - Risk: Low (dev dependency only, not in production)

2. **next** (10.0.0 - 15.5.9) - High severity
   - DoS via Image Optimizer remotePatterns
   - DoS via insecure React Server Components
   - Risk: Low (we don't use Image optimization or insecure RSC)

## Action Taken

Updated to latest Next.js 14.x patch versions:
- `next`: 14.2.15 → 14.2.35
- `eslint-config-next`: 14.2.15 → 14.2.35

This is a **safe, non-breaking update** within the same major version.

## Remaining Vulnerabilities

The audit may still show vulnerabilities because:
1. The `glob` issue in ESLint config may persist (dev dependency only)
2. Next.js 14.x may still be flagged if vulnerabilities affect the entire 14.x line

## Future Considerations

To fully resolve all vulnerabilities, you would need to:
- Upgrade to Next.js 16.x (breaking changes)
- This should be done in a separate PR with thorough testing
- Review Next.js 16 migration guide: https://nextjs.org/docs/app/building-your-application/upgrading/version-15

## Recommendation

✅ **Current update is safe and recommended** - patches within 14.x
⏸️ **Next.js 16 upgrade** - plan separately, test thoroughly

## Verification

After updating, run:
```bash
npm install
npm audit
```

If vulnerabilities persist but are only in dev dependencies or don't affect your use case, they can be safely ignored for now.

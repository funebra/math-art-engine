# Contributing to Funebra Math-Art Engine

Thanks for helping build Funebra Math-Art Engine!

## Quick Start
1. Fork the repo and create a feature branch.
2. Run and test locally; add/adjust unit or visual tests if applicable.
3. Use conventional commits (`feat:`, `fix:`, `docs:`…).  
4. Open a pull request with a clear description and before/after screenshots if UI-related.

## License and DCO
By contributing, you agree your contributions are licensed under the repository's
licenses (see `LICENSE`). We also require a DCO sign-off in your commits.

Add this to each commit message:

```
Signed-off-by: Your Name <you@example.com>
```

Read more about the DCO: https://developercertificate.org/

## Code Style
- ESM modules, modern JS/TS.
- Small, pure functions for math helpers.
- No Canvas for core plotting (DOM-first); keep adapters modular.
- Prefer parameter docs via JSDoc.

## Security
Report vulnerabilities privately to **security@plabsfill.com**. See `SECURITY.md`.

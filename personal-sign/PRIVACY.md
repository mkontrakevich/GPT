# Personal Sign — Privacy & Local Data Model

Version: 1.5

## Principle

Personal Sign is local-first. Documents and handwritten signature strokes are processed in the browser. There is no application backend for document upload or storage.

## Session data

Kept only in the page's working memory during an active signing session:

- source PDF / converted DOC / DOCX bytes;
- rendered page canvas;
- handwritten stroke points;
- cropped transparent signature image;
- unsigned working PDF.

After the final PDF is created, source document bytes, the rendered source canvas and the separate signature image/strokes are cleared from the application state. Leaving the signing flow also clears the working session.

## Signed output

The final signed PDF is held in memory until the user downloads it or explicitly saves it into Local Vault.

The .psig sidecar contains:
- SHA-256 of the exact signed PDF;
- signing timestamp;
- ECDSA P-256 public key;
- ECDSA signature;
- source format;
- application version.

The original source filename is intentionally not included in .psig in v1.5.

## Device signing key

An ECDSA P-256 key pair is created with Web Crypto.

- private key: non-extractable CryptoKey;
- storage: IndexedDB of the current browser/origin;
- public key: exported into .psig for verification.

The private key is not exported by the application.

## Local Vault

Vault stores only documents explicitly saved by the user.

Stored IndexedDB record metadata:
- random record id;
- creation timestamp;
- AES-GCM IV;
- ciphertext.

The PDF filename, PDF bytes and .psig are inside the encrypted payload.

### Vault protection v1.5

- cipher: AES-256-GCM;
- key derivation: PBKDF2-HMAC-SHA-256;
- iterations: 350,000;
- random salt: 128 bits;
- PIN/password: never stored;
- derived AES key: RAM only while Vault is unlocked;
- automatic lock: when the page goes to background;
- inactivity lock: 2 minutes while unlocked.

A verifier encrypted with the derived key is stored so the application can detect an incorrect password without storing the password itself.

Existing v1.4 Vault records are migrated from the previous device AES key to the PIN/password-derived key on first setup.

## Local preferences

localStorage contains only:
- pen width;
- ballpoint mode enabled/disabled.

It does not contain documents, filenames, signature images or PIN/passwords.

## Local cache / PWA

The service worker caches application resources for repeat/offline use.

Clearing Personal Sign local data removes:
- IndexedDB keys;
- Vault ciphertext;
- pen settings;
- Personal Sign caches.

Browser/OS storage clearing can also remove these records.

## Privacy screen

The app exposes a "Приватность и данные" screen showing the local storage model and allows the user to clear Personal Sign local data.

## Current network limitation

v1.5 still downloads several JavaScript libraries from third-party CDNs on first load. The application adds no-referrer loading and caches resources afterwards, and the application code does not upload document contents.

However, third-party runtime code executing in the page remains a supply-chain trust dependency. Full isolation requires vendoring all runtime libraries under the Personal Sign origin and applying a restrictive Content Security Policy.

This is the main remaining privacy-hardening item before describing the product as fully self-contained/offline-first.

## Not a qualified electronic signature

The visual signature plus .psig is a document-integrity mechanism. It is not automatically equivalent to a qualified electronic signature.

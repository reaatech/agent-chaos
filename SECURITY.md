# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, please report them via email to the maintainers. You should receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible depending on complexity.

## Security Considerations

- This library is designed for development and testing environments. It should **not** be used in production without careful consideration.
- Fault injection can disrupt application behavior. Always run chaos tests in isolated environments.
- The `SeededRandom` PRNG is deterministic but not cryptographically secure. Do not use it for security-sensitive randomization.

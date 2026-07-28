<!-- openwolf:begin -->
# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.
<!-- openwolf:end -->

# Git Commit Standard
**Read and obey before executing any git command.**

You MUST write all commit messages in **English** using **Conventional Commits**. Any other format or language is strictly prohibited.

**Mandatory Format:**
`<type>(<scope>): <imperative description>`

`<Body: Explain WHY this change was made and WHAT was done>`

**Rules:**
1. **Allowed types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.
2. **Language:** Always in English.
3. **NO generic messages** (e.g., "update file", "fix bug").
4. **The BODY is mandatory.** You must explain the context and reasoning.
5. **Imperative mood only** ("add", not "added" or "adds").

**Example:**
```
feat(auth): add login validation

Prevent empty passwords on the login screen and improve security.
```

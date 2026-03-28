# claude-rank v2.0.1 — Viral Demo GIF
# Hook: "Why won't AI cite my site?"

Output assets/demo.gif

Set Shell zsh
Set Theme "Catppuccin Mocha"
Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 1280
Set Height 720
Set Padding 24
Set TypingSpeed 30ms
Set CursorBlink false

# ── Hook comment ──
Sleep 300ms
Type "# Why won't AI cite my site? Let's find out."
Enter
Sleep 800ms

# ── SEO Audit ──
Type "claude-rank scan tests/fixtures"
Enter
Sleep 4000ms
Sleep 2500ms

# ── AI Citability with 7-dimension breakdown ──
Type "claude-rank citability tests/fixtures"
Enter
Sleep 3500ms
Sleep 3000ms

# ── GEO — AI search readiness ──
Type "claude-rank geo tests/fixtures"
Enter
Sleep 3500ms
Sleep 2500ms

# ── Outro ──
Type "# 170+ rules. 10 scanners. Zero config. Free."
Enter
Sleep 400ms
Type "# npm i -g @houseofmvps/claude-rank"
Enter
Sleep 2500ms

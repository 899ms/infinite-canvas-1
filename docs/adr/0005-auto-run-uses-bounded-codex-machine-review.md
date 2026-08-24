# Auto Run uses bounded Codex machine review

FrameFlow Auto Run is an autonomous, direction-bound loop: Codex plans a Prompt, ImageGen produces the round, Codex reviews every generated image, and the next Prompt uses those machine reviews before the next round starts. A configured maximum iteration count bounds generation cost, and a manual stop prevents any later round while preserving completed generation and review facts.

Machine Review is stored separately from Human Preference Evidence. Codex may record a 1–5 rating, Comment, strengths, issues, and a keep/vary/reject decision for autonomous iteration, but it may not write user ratings, trigger “不喜欢并学习”, or delete an asset. Human feedback remains an optional correction that alone changes Preference DNA. This separation avoids self-reinforcing machine judgments being misrepresented as learned user taste, while still making Auto Run genuinely autonomous.

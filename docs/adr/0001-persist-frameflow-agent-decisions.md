# Persist FrameFlow Agent Decisions as facts

FrameFlow records each planning decision as an immutable event beside the Prompt Version instead of reconstructing it later from the generated prompt. This costs additional event data, but preserves the exact Preference Evidence snapshot and the Agent's adopted, avoided, or ignored disposition after ratings and comments change; Prompt Diff is derived and stored at the same planning boundary so lineage never depends on a later model call.

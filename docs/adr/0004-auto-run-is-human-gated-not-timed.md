# Auto Run is human-gated, not timed

Status: Superseded by ADR-0005.

FrameFlow starts an Auto Run immediately from a Creative Brief, records each Prompt, Agent Decision, Generation Run, image, and review, then stops at a Review Gate until the current images have been explicitly reviewed. Timer-based or daily generation was rejected because it can spend generation capacity without new human evidence; completing the gate starts the next iteration with the latest Preference DNA, while stopping the Auto Run preserves all existing lineage.

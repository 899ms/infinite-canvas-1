import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const ratingLabels = ["1 星：强降权", "2 星：降权", "3 星：中性观察", "4 星：继续变体", "5 星：强化"] as const;

export function ImageFeedbackRating({ value, onChange, disabled = false }: { value?: 1 | 2 | 3 | 4 | 5; onChange: (rating: 1 | 2 | 3 | 4 | 5) => void; disabled?: boolean }) {
    return (
        <div role="group" aria-label="图片星级评分" className="flex items-center gap-0.5">
            {ratingLabels.map((label, index) => {
                const rating = (index + 1) as 1 | 2 | 3 | 4 | 5;
                const active = Boolean(value && rating <= value);
                return (
                    <button
                        key={rating}
                        type="button"
                        aria-label={label}
                        aria-pressed={value === rating}
                        title={label}
                        disabled={disabled}
                        className={cn("rounded p-1 text-stone-300 transition hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-stone-300", active && "text-amber-400 disabled:hover:text-amber-400")}
                        onClick={() => onChange(rating)}
                    >
                        <Star className="size-5" fill={active ? "currentColor" : "none"} />
                    </button>
                );
            })}
        </div>
    );
}

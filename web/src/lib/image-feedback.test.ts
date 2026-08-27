import { expect, it } from "vitest";
import { feedbackLabel, feedbackWeight, preferenceSignals } from "./image-feedback";

it("maps ratings to the product feedback loop", () => {
    const base = { id: "x", comment: "", hidden: false, createdAt: "", updatedAt: "" };
    expect(feedbackLabel({ ...base, rating: 5 })).toBe("强化");
    expect(feedbackWeight({ ...base, rating: 1 })).toBe(-2);
    expect(feedbackWeight({ ...base, hidden: true })).toBe(-4);
    expect(preferenceSignals({ a: { ...base, rating: 5, style: "电影感", scene: "室内" }, b: { ...base, id: "b", rating: 2, style: "电影感", scene: "室内" } })).toEqual({ styles: [{ label: "电影感", score: 2 }], scenes: [{ label: "室内", score: 2 }] });
});

import { expect, it } from "bun:test";
import { add } from "../../packages/server/utils/math";

it("should add correctly", () => {
	const result = add(1, 2);

	expect(result).toBe(3);
});

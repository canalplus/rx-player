import { expect } from "vitest";
export default function expectPlayerError(player, { code, type }) {
  const error = player.getError();
  expect(error).not.toBeNull();
  expect(error.code).to.equal(code);
  expect(error.type).to.equal(type);
  expect(error.name).to.equal(upperSnakeToPascalCase(type));
}

function upperSnakeToPascalCase(str) {
  return str
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

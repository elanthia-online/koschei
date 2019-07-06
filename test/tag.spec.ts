import Tag from "../src/parser/tag"

test("Tag.maybe_merge() -> b -> a", function () {
  const a = Tag.of("a", {exist: "1324"}, "black cat")
  const b = Tag.of("b", {})
  b.add_child(a)
  Tag.maybe_merge(b)
  expect(b.name).toBe("monster")
})

test("Tag.maybe_merge() -> b -> b -> a", function () {
  const a   = Tag.of("a", {exist: "1324"}, "black cat")
  const b_1 = Tag.of("b", {})
  const b_2 = Tag.of("b", {})
  const component = Tag.of("component", {})
  b_1.add_child(a)
  b_2.add_child(b_1)
  component.add_child(b_2)
  Tag.maybe_merge(component)
  expect(b_2.name).toBe("monster")
  console.log(b_2)
})
import {Tag, Parser} from "../src/parser"
import fs from "fs"

type ParserResult ={ 
  tags   : Tag[];
  parser : Parser;
  first  : Tag;
  last   : Tag;
}

const consume_xml = async (file : string) : Promise<ParserResult> => new Promise(ok => {
  const parser = Parser.of()
  const tags  : Tag[] = []
  parser.on("tag", tag => tags.push(tag))
  parser.on("finish", () => {
    const last = tags[tags.length-1]
    expect(last.name).toBe("done")
    ok({parser, tags, last, first: tags[0]}) 
  })
  fs.createReadStream(__dirname + "/xml/" + file).pipe(parser)
})

test("Parser#parse() : xml(:basic)", async function () {
  const {tags, first, last} = await consume_xml("basic.xml")
  expect(tags.length).toBeGreaterThan(0)
  expect(last.name).toBe("done")
  expect(first.name).toBe("tree")
  expect(first.children.length).toEqual(2)
})

test("Parser#parse() : xml(:inventory)", async function () {
  const {tags} = await consume_xml("inventory.xml")
  expect(tags.length).toBeGreaterThan(0)
  const container = tags.find(tag => tag.name == "container")
  expect(container).not.toBeNull()
})

test("Parser#parse() : xml(:movement)", async function () {
  const {tags, first, last} = await consume_xml("movement.xml")
  expect(tags.length).toBeGreaterThan(0)
  expect(last.name).toBe("done")
  const room_players = tags.filter( tag => tag.id == "room players")
  room_players.forEach(tag => {
    if (tag.text.length) expect(tag.children.length).toBeGreaterThan(0)
    else expect(tag.children.length).toBe(0)
  })
})
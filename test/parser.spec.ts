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
    expect(last).toMatchObject({name: "done"})
    expect(tags.length).toBeGreaterThan(0)
    ok({parser, tags, last, first: tags[0]}) 
  })
  fs.createReadStream(__dirname + "/xml/" + file).pipe(parser)
})

test("Parser#parse() : xml(:basic)", async function () {
  const {tags, first, last} = await consume_xml("basic.xml")
  expect(first.name).toBe("tree")
  expect(first.children.length).toEqual(2)
})

test("Parser#parse() : xml(:inventory)", async function () {
  const {tags} = await consume_xml("inventory.xml")
  const container = tags.find(tag => tag.name == "container")
  expect(container).not.toBeNull()
})

test("Parser#parse() : xml(:movement)", async function () {
  const {tags, first, last} = await consume_xml("movement.xml")
  
  const room_players = tags.filter( tag => tag.id == "room players")
  room_players.forEach(tag => {
    if (tag.text.length) expect(tag.children.length).toBeGreaterThan(0)
    else expect(tag.children.length).toBe(0)
  })
})

test("Parser#parse() : xml(:launch_url)", async function () {
  const {tags, first, last} = await consume_xml("launch_url.xml")
  const launchurl = tags.find(tag => tag.name == "launchurl") as Tag

  expect(launchurl.attrs).toMatchObject(
    { src: "/gs4/play/cm/loader.asp?uname=W_TRAVIS-CI-2_000&gcode=GS4&charindex=1123623&tcode=23412351252&hmac=youcanttouchthis"
    })
})

test("Parser#parse() : xml(:output)", async function () {
  const {tags, first, last} = await consume_xml("output.xml")
  expect(tags.filter(tag => tag.name == "output").length)
    .toBeGreaterThan(1)
})

test("Parser#parse() : text", async function () {
  return new Promise((ok, err)=> {
    const parser = Parser.of()
    const tags : Tag[] = []
    parser.on("tag", tag => tags.push(tag))
    parser.on("finish", () => {
      expect(tags.length).toBeGreaterThan(0)
      const last_tag = tags.pop()
      expect(last_tag).toMatchObject({name: "text"})
      ok()
    })
    fs.createReadStream(__dirname + "/xml/text.xml").pipe(parser)
  })
})
enum TEXT_TAGS 
  { text
  , style
  }


export default class Tag {
  static INLINE_TAG_NAMES : Record<string, boolean> = 
    { b      : true
    , a      : true
    , d      : true
    , preset : true
    }

  static MAPPINGS : Record<string, string> = 
    { monsterbold : "b"
    , bold        : "b"
    }
  static normalize_name (name : string) : string {
    name = name.toLowerCase().replace(/^(push|pop)/, "")
    return Tag.MAPPINGS[name] || name
  }

  static is_fake_self_closing (name : string, attrs : Record<string, string>) {
    return (
         (name == "style" && attrs.id !== "") 
      || (name == "output" && attrs.class !== "") 
      || name.startsWith("push"))
  }

  static should_fast_forward (name: string, attrs : Record<string, string>) {
    return (  
         (name == "style" && attrs.id == "")
      || (name == "output" && attrs.class == "")
      || (name.startsWith("pop")))
  }

  static TEXT_TAGS = TEXT_TAGS

  static is_inline (tag : Tag) : boolean {
    return tag && Tag.INLINE_TAG_NAMES[tag.name] || false
  }

  static is_text (tag : Tag) {
    return tag.name == "text"
  }
  static is_root (tag : Tag) {
    return !Tag.is_inline(tag)
  }

  static maybe_merge (tag : Tag) : void {
    //console.log(`Tag[${tag.name}] -> ${tag.children.length}`)
    // root tags should bail early
    if (tag.children.length == 0) return
    // handle component tags
    if (tag.children.length > 1)  return tag.children.forEach(Tag.maybe_merge)
    // length == 1
    const child = tag.children[0]
    // not a bold tag so can't be a monster
    if (tag.name !== "b") return Tag.maybe_merge(child)
    // flatten b > b 
    if (child.name == tag.name) {
      tag.children = child.children
      // recursive for b > b > a
      return Tag.maybe_merge(tag)
    }

    if (child.name == "a") {
      tag.name = "monster"
      Object.assign(tag.attrs, child.attrs)
      return void(tag.children.length = 0)
    }
  }

  static of (name : string, attrs : Record<string, string>, text : string = "") {
    return new Tag(name, attrs, text)
  }
  name      : string;
  text      : string;
  id?       : string;
  attrs     : Record<string, string>;
  children  : Array<Tag>;
  start?    : number;
  end?      : number;
  constructor (name : string, attrs : Record<string, string>, text : string) {
    this.name     = Tag.normalize_name(name)
    this.text     = text
    this.attrs    = attrs
    this.children = []
    if (attrs.id) this.id = attrs.id.toString()
  }

  get inline () {
    return Tag.is_inline(this)
  }

  get complete_inline () {
    return this.inline && this.text.endsWith("\r\n")
  }

  get pending_line () {
    return this.inline && !this.text.endsWith("\r\n")
  }

  attr (key : string) {
    return (this.attrs || {})[key]
  }

  add_child (tag : Tag) {
    tag.start = this.text.length
    this.text = this.text + tag.text
    tag.end   = this.text.length
    //if (this.name == "b" && tag.name == "b") return Object.assign(this.attrs, tag.attrs)
    this.children.push(tag)
    return
  }
}
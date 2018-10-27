export const is_empty = 
  (s : string) => s.length == 0

export const is_not_empty =
  (s : string)=> !is_empty(s)
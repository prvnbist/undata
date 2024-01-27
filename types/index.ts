export type Row = {
   [key in string]: any
}

export type Column = {
   id: string
   type?: string
   title: string
   hidden: boolean
}

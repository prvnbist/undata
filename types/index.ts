export type Row = {
   [key in string]: any
}

export type Column = {
   hidden: boolean
   id: string
   title: string
   type: string | null
   formatType: 'select' | 'url' | 'image' | null
}

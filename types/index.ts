export type Row = {
   [key in string]: any
}

export type Column = {
   hidden: boolean
   id: string
   title: string
   type: string | null
   formatType: 'single_select' | 'multi_select' | 'url' | 'image' | null
}

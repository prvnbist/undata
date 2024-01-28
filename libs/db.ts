import postgres from 'postgres'

const db = postgres(process.env.DATABASE_URL!, {
   ssl: {
      rejectUnauthorized: false,
   },
})

export default db

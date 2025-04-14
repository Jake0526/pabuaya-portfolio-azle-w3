import express from 'express'

import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'

import { Database } from 'sql.js/dist/sql-asm.js'
import { initDb } from './db'

import typeDefs from './api/main/typeDefs.js'
import resolvers from './api/main/resolvers.js'

import mutationTypeDefsM from './api/mutation/typeDefs.js'
import mutationResolvers from './api/mutation/resolvers.js'

export let db: Database

async function init (): Promise<void> {
  const app = express()
  db = await initDb()

  const server = new ApolloServer({
    typeDefs: [typeDefs, mutationTypeDefsM],
    resolvers: {
      ...resolvers,
      ...mutationResolvers
    }
  })

  await server.start()

  app.use(express.json({ limit: '50mb' }), expressMiddleware(server, {}))

  app.get('/', (req, res) => {
    res.send('Keep Distance!')
  })

  app.listen()
}

init()

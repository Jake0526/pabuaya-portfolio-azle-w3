import { SqlValue } from 'sql.js/dist/sql-asm.js'
import { sqlite } from '../../db'
import { db } from '../..'

export type Message = {
  id: number
  budget: string
  targetCompletion: string
  fullName: string
  email: string
  message: string
  createdAt: string
}

const resolvers = {
  Query: {
    async messages(obj: any, args: Record<string, any>) {
      const messages = sqlite<Message>`SELECT * FROM messages`(
        db,
        (sqlValues: SqlValue[]): Message => {
          return {
            id: sqlValues[0] as number,
            budget: sqlValues[1] as string,
            targetCompletion: sqlValues[2] as string,
            fullName: sqlValues[3] as string,
            email: sqlValues[3] as string,
            message: sqlValues[3] as string,
            createdAt: sqlValues[3] as string
          }
        }
      )

      return messages;
    },
  },
};

export default resolvers;

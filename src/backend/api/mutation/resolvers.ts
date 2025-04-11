import moment from 'moment';
import { SqlValue } from 'sql.js/dist/sql-asm.js'
import { sqlite } from '../../db'
import { db } from '../..'

export type Message = {
  budget: string
  targetCompletion: string
  fullName: string
  email: string
  message: string
  createdAt: string
}

const resolvers = {
  Mutation: {
    async createMessage(obj: any, args: Record<string, any>) {
      const result = {
        message: '',
        status: '',
        insertedID: null,
      };

      const create = {
        budget: args.input.budget ? args.input.budget : '',
        targetCompletion: args.input.targetCompletion ? args.input.targetCompletion : '',
        fullName: args.input.fullName ? args.input.fullName : '',
        email: args.input.email ? args.input.email : '',
        message: args.input.message ? args.input.message : '',
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss')
      };

      sqlite`INSERT INTO messages 
      (budget, targetCompletion, fullName, email, message, createdAt) VALUES 
      ('${create.budget}', '${create.targetCompletion}', '${create.fullName}', '${create.email}', '${create.message}', '${create.createdAt}')`(
        db
      )

      const insertedIdVal = sqlite<number>`SELECT last_insert_rowid()`(
        db,
        sqlValues => sqlValues[0] as number
      )[0]

      result.message = 'Successfully Created';
      result.status = 'success';
      result.insertedID = insertedIdVal;

      return result;
    },
  },
};

export default resolvers;

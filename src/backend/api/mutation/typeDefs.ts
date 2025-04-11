const typeDefs = `
  type Mutation {
    createMessage(input: InputMessage!): InsertQueryResponse
  }

  input InputMessage {
    budget: String
    targetCompletion: String
    fullName: String
    email: String
    message: String
  }

  type InsertQueryResponse {
    message: String
    status: String
    insertedID: String
  }
`

export default typeDefs

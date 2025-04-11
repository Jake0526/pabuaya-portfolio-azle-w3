const typeDefs = `
  type Query {
    messages: [Message]
  }

  type Message {
    id: Int
    budget: String
    targetCompletion: String
    fullName: String
    email: String
    message: String
    createdAt: String
  }
`;

export default typeDefs;

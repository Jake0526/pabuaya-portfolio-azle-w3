export const migration0 = `
    CREATE TABLE messages
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget VARCHAR(255) DEFAULT NULL,
        targetCompletion VARCHAR(255) DEFAULT NULL,
        fullName VARCHAR(255) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        message VARCHAR(255) DEFAULT NULL,
        createdAt VARCHAR(255) DEFAULT NULL
    );
`;

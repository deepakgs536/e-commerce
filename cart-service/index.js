const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.CARTS_TABLE_NAME || "CartsTable";

exports.handler = async (event) => {
    const { httpMethod, path, body, pathParameters } = event;

    try {
        if (httpMethod === 'GET' && path.startsWith('/carts/') && pathParameters && pathParameters.userId) {
            const data = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { userId: pathParameters.userId }
            }));
            const cart = data.Item || { userId: pathParameters.userId, items: [] };
            return { statusCode: 200, body: JSON.stringify(cart) };
        }
        else if (httpMethod === 'POST' && path.startsWith('/carts/') && pathParameters && pathParameters.userId) {
            const { productId, quantity } = JSON.parse(body);
            
            // Fetch existing cart
            let data = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { userId: pathParameters.userId }
            }));
            
            let cart = data.Item || { userId: pathParameters.userId, items: [] };
            
            // Add or update item
            const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
            if (existingItemIndex >= 0) {
                cart.items[existingItemIndex].quantity += quantity;
            } else {
                cart.items.push({ productId, quantity });
            }
            
            // Save updated cart
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: cart
            }));
            
            return { statusCode: 200, body: JSON.stringify({ message: "Cart updated", cart }) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    } catch (error) {
        console.error("Error processing request:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ORDERS_TABLE_NAME || "OrdersTable";

exports.handler = async (event) => {
    const { httpMethod, path, body, pathParameters } = event;

    try {
        if (httpMethod === 'POST' && path === '/orders') {
            const order = JSON.parse(body);
            order.orderId = Date.now().toString(); // simple ID generation
            order.status = 'PENDING';
            order.createdAt = new Date().toISOString();
            
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: order
            }));
            
            return { statusCode: 201, body: JSON.stringify({ message: "Order placed", order }) };
        }
        else if (httpMethod === 'GET' && path.startsWith('/orders/') && pathParameters && pathParameters.id) {
            const data = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { orderId: pathParameters.id }
            }));
            if (!data.Item) {
                return { statusCode: 404, body: JSON.stringify({ error: "Order not found" }) };
            }
            return { statusCode: 200, body: JSON.stringify(data.Item) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    } catch (error) {
        console.error("Error processing request:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

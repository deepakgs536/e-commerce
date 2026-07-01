const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.INVENTORY_TABLE_NAME || "InventoryTable";

exports.handler = async (event) => {
    const { httpMethod, path, body, pathParameters } = event;

    try {
        if (httpMethod === 'GET' && path.startsWith('/inventory/') && pathParameters && pathParameters.productId) {
            const data = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { productId: pathParameters.productId }
            }));
            if (!data.Item) {
                return { statusCode: 404, body: JSON.stringify({ error: "Inventory record not found" }) };
            }
            return { statusCode: 200, body: JSON.stringify(data.Item) };
        }
        else if (httpMethod === 'PUT' && path.startsWith('/inventory/') && pathParameters && pathParameters.productId) {
            const { stockChange } = JSON.parse(body); // e.g., -1 for decreasing stock
            
            const data = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { productId: pathParameters.productId },
                UpdateExpression: "SET stock = stock + :val",
                ExpressionAttributeValues: {
                    ":val": stockChange
                },
                ReturnValues: "ALL_NEW"
            }));
            
            return { statusCode: 200, body: JSON.stringify({ message: "Inventory updated", inventory: data.Attributes }) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    } catch (error) {
        console.error("Error processing request:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

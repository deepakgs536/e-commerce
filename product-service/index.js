const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";

exports.handler = async (event) => {
    const { httpMethod, path, body, pathParameters } = event;

    try {
        if (httpMethod === 'GET' && path === '/products') {
            const data = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
            return { statusCode: 200, body: JSON.stringify(data.Items) };
        } 
        else if (httpMethod === 'GET' && path.startsWith('/products/') && pathParameters && pathParameters.id) {
            const data = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { productId: pathParameters.id }
            }));
            if (!data.Item) {
                return { statusCode: 404, body: JSON.stringify({ error: "Product not found" }) };
            }
            return { statusCode: 200, body: JSON.stringify(data.Item) };
        }
        else if (httpMethod === 'POST' && path === '/products') {
            const product = JSON.parse(body);
            product.productId = Date.now().toString(); // simple ID generation
            
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: product
            }));
            
            return { statusCode: 201, body: JSON.stringify({ message: "Product created", product }) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    } catch (error) {
        console.error("Error processing request:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

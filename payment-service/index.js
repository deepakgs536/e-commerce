const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PAYMENTS_TABLE_NAME || "PaymentsTable";

exports.handler = async (event) => {
    const { httpMethod, path, body } = event;

    try {
        if (httpMethod === 'POST' && path === '/payments') {
            const { orderId, amount, paymentMethodId } = JSON.parse(body);
            
            // Mock payment processing logic here (e.g., Stripe API)
            const paymentStatus = 'SUCCESS'; // Assume success for demo
            
            const paymentRecord = {
                paymentId: Date.now().toString(),
                orderId,
                amount,
                status: paymentStatus,
                processedAt: new Date().toISOString()
            };
            
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: paymentRecord
            }));
            
            return { statusCode: 201, body: JSON.stringify({ message: "Payment processed", payment: paymentRecord }) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    } catch (error) {
        console.error("Error processing request:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PAYMENTS_TABLE_NAME || "PaymentsTable";

exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, body } = event;

    try {

        // Health Check
        if (httpMethod === "GET" && path === "/health") {
            return response(200, {
                success: true,
                message: "Payment Service Running",
            });
        }

        // Process Payment
        if (httpMethod === "POST" && path === "/payments") {
            return await processPayment(body);
        }

        // Get Payment
        if (httpMethod === "GET" && pathParameters?.id) {
            return await getPayment(pathParameters.id);
        }

        // Replace Payment
        if (httpMethod === "PUT" && pathParameters?.id) {
            return await replacePayment(pathParameters.id, body);
        }

        // Update Status
        if (
            httpMethod === "PATCH" &&
            path.includes("/status") &&
            pathParameters?.id
        ) {
            return await updateStatus(pathParameters.id, body);
        }

        // Delete Payment
        if (httpMethod === "DELETE" && pathParameters?.id) {
            return await deletePayment(pathParameters.id);
        }

        // Get Payment By Order
        if (
            httpMethod === "GET" &&
            path.includes("/orders/") &&
            pathParameters?.orderId
        ) {
            return await getPaymentByOrder(pathParameters.orderId);
        }

        return response(404, {
            success: false,
            message: "Route not found",
        });

    } catch (err) {
        console.error(err);

        return response(500, {
            success: false,
            message: err.message,
        });
    }
};

// =====================================
// PROCESS PAYMENT
// =====================================

async function processPayment(body) {

    const { orderId, amount, paymentMethodId } = JSON.parse(body);

    // Mock payment gateway
    const payment = {
        paymentId: crypto.randomUUID(),
        orderId,
        amount,
        paymentMethodId,
        status: "SUCCESS",
        processedAt: new Date().toISOString(),
    };

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: payment,
        })
    );

    return response(201, {
        success: true,
        message: "Payment processed",
        data: payment,
    });
}

// =====================================
// GET PAYMENT
// =====================================

async function getPayment(paymentId) {

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                paymentId,
            },
        })
    );

    if (!data.Item) {
        return response(404, {
            success: false,
            message: "Payment not found",
        });
    }

    return response(200, data.Item);
}

// =====================================
// REPLACE PAYMENT
// =====================================

async function replacePayment(paymentId, body) {

    const payment = JSON.parse(body);

    payment.paymentId = paymentId;

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: payment,
        })
    );

    return response(200, {
        success: true,
        message: "Payment updated",
        data: payment,
    });
}

// =====================================
// UPDATE STATUS
// =====================================

async function updateStatus(paymentId, body) {

    const { status } = JSON.parse(body);

    await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                paymentId,
            },
            UpdateExpression: "SET #status = :status",
            ExpressionAttributeNames: {
                "#status": "status",
            },
            ExpressionAttributeValues: {
                ":status": status,
            },
        })
    );

    return response(200, {
        success: true,
        message: "Payment status updated",
    });
}

// =====================================
// DELETE PAYMENT
// =====================================

async function deletePayment(paymentId) {

    await docClient.send(
        new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                paymentId,
            },
        })
    );

    return response(200, {
        success: true,
        message: "Payment deleted",
    });
}

// =====================================
// GET PAYMENT BY ORDER
// Requires GSI: orderId-index
// =====================================

async function getPaymentByOrder(orderId) {

    const data = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "orderId-index",
            KeyConditionExpression: "orderId = :orderId",
            ExpressionAttributeValues: {
                ":orderId": orderId,
            },
        })
    );

    return response(200, data.Items || []);
}

// =====================================
// RESPONSE
// =====================================

function response(statusCode, body) {

    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}
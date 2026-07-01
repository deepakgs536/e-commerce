const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.ORDERS_TABLE_NAME || "OrdersTable";

exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, body } = event;

    try {

        // Health Check
        if (httpMethod === "GET" && path === "/health") {
            return response(200, {
                success: true,
                message: "Order Service Running",
            });
        }

        // Place Order
        if (httpMethod === "POST" && path === "/orders") {
            return await createOrder(body);
        }

        // Get Order
        if (httpMethod === "GET" && pathParameters?.id) {
            return await getOrder(pathParameters.id);
        }

        // Replace Order
        if (httpMethod === "PUT" && pathParameters?.id) {
            return await replaceOrder(pathParameters.id, body);
        }

        // Update Status
        if (
            httpMethod === "PATCH" &&
            path.includes("/status") &&
            pathParameters?.id
        ) {
            return await updateStatus(pathParameters.id, body);
        }

        // Delete Order
        if (httpMethod === "DELETE" && pathParameters?.id) {
            return await deleteOrder(pathParameters.id);
        }

        // Get Orders By User (requires GSI)
        if (
            httpMethod === "GET" &&
            pathParameters?.userId &&
            path.includes("/users/")
        ) {
            return await getOrdersByUser(pathParameters.userId);
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
// CREATE ORDER
// =====================================

async function createOrder(body) {

    const order = JSON.parse(body);

    order.orderId = crypto.randomUUID();
    order.status = "PENDING";
    order.createdAt = new Date().toISOString();

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: order,
        })
    );

    return response(201, {
        success: true,
        message: "Order placed",
        data: order,
    });
}

// =====================================
// GET ORDER
// =====================================

async function getOrder(orderId) {

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                orderId,
            },
        })
    );

    if (!data.Item) {
        return response(404, {
            success: false,
            message: "Order not found",
        });
    }

    return response(200, data.Item);
}

// =====================================
// REPLACE ORDER
// =====================================

async function replaceOrder(orderId, body) {

    const order = JSON.parse(body);

    order.orderId = orderId;

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: order,
        })
    );

    return response(200, {
        success: true,
        message: "Order updated",
        data: order,
    });
}

// =====================================
// UPDATE STATUS
// =====================================

async function updateStatus(orderId, body) {

    const { status } = JSON.parse(body);

    await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                orderId,
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
        message: "Order status updated",
    });
}

// =====================================
// DELETE ORDER
// =====================================

async function deleteOrder(orderId) {

    await docClient.send(
        new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                orderId,
            },
        })
    );

    return response(200, {
        success: true,
        message: "Order deleted",
    });
}

// =====================================
// GET USER ORDERS
// Requires GSI: userId-index
// =====================================

async function getOrdersByUser(userId) {

    const data = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "userId-index",
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId,
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
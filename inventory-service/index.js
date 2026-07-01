const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME =
    process.env.INVENTORY_TABLE_NAME || "InventoryTable";

exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, body } = event;

    try {

        // Health Check
        if (httpMethod === "GET" && path === "/health") {
            return response(200, {
                success: true,
                message: "Inventory Service Running",
            });
        }

        // Create Inventory
        if (httpMethod === "POST" && path === "/inventory") {
            return await createInventory(body);
        }

        // Get Inventory
        if (httpMethod === "GET" && pathParameters?.productId) {
            return await getInventory(pathParameters.productId);
        }

        // Replace Inventory
        if (httpMethod === "PUT" && pathParameters?.productId) {
            return await replaceInventory(
                pathParameters.productId,
                body
            );
        }

        // Update Stock
        if (
            httpMethod === "PATCH" &&
            path.includes("/stock") &&
            pathParameters?.productId
        ) {
            return await updateStock(
                pathParameters.productId,
                body
            );
        }

        // Delete Inventory
        if (
            httpMethod === "DELETE" &&
            pathParameters?.productId
        ) {
            return await deleteInventory(
                pathParameters.productId
            );
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
// CREATE INVENTORY
// =====================================

async function createInventory(body) {

    const inventory = JSON.parse(body);

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: inventory,
        })
    );

    return response(201, {
        success: true,
        message: "Inventory created",
        data: inventory,
    });
}

// =====================================
// GET INVENTORY
// =====================================

async function getInventory(productId) {

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                productId,
            },
        })
    );

    if (!data.Item) {
        return response(404, {
            success: false,
            message: "Inventory not found",
        });
    }

    return response(200, data.Item);
}

// =====================================
// REPLACE INVENTORY
// =====================================

async function replaceInventory(productId, body) {

    const inventory = JSON.parse(body);

    inventory.productId = productId;

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: inventory,
        })
    );

    return response(200, {
        success: true,
        message: "Inventory updated",
        data: inventory,
    });
}

// =====================================
// UPDATE STOCK
// =====================================

async function updateStock(productId, body) {

    const { stockChange } = JSON.parse(body);

    const result = await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                productId,
            },
            UpdateExpression:
                "SET stock = stock + :change",
            ExpressionAttributeValues: {
                ":change": stockChange,
            },
            ReturnValues: "ALL_NEW",
        })
    );

    return response(200, {
        success: true,
        message: "Stock updated",
        data: result.Attributes,
    });
}

// =====================================
// DELETE INVENTORY
// =====================================

async function deleteInventory(productId) {

    await docClient.send(
        new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                productId,
            },
        })
    );

    return response(200, {
        success: true,
        message: "Inventory deleted",
    });
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
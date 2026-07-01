const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME =
    process.env.PRODUCTS_TABLE_NAME || "ProductsTable";

exports.handler = async (event) => {
    const { httpMethod, path, body, pathParameters } = event;

    try {
        switch (true) {

            // ----------------------------------------------------
            // GET ALL PRODUCTS
            // ----------------------------------------------------
            case httpMethod === "GET" && path === "/products":
                return getProducts();

            // ----------------------------------------------------
            // GET PRODUCT BY ID
            // ----------------------------------------------------
            case httpMethod === "GET" &&
                /^\/products\/[^/]+$/.test(path):
                return getProduct(pathParameters.id);

            // ----------------------------------------------------
            // CREATE PRODUCT
            // ----------------------------------------------------
            case httpMethod === "POST" &&
                path === "/products":
                return createProduct(body);

            // ----------------------------------------------------
            // UPDATE ENTIRE PRODUCT
            // ----------------------------------------------------
            case httpMethod === "PUT" &&
                /^\/products\/[^/]+$/.test(path):
                return replaceProduct(pathParameters.id, body);

            // ----------------------------------------------------
            // PATCH PRODUCT
            // ----------------------------------------------------
            case httpMethod === "PATCH" &&
                /^\/products\/[^/]+$/.test(path):
                return updateProduct(pathParameters.id, body);

            // ----------------------------------------------------
            // SOFT DELETE
            // ----------------------------------------------------
            case httpMethod === "DELETE" &&
                /^\/products\/[^/]+$/.test(path):
                return softDeleteProduct(pathParameters.id);

            // ----------------------------------------------------
            // HARD DELETE
            // ----------------------------------------------------
            case httpMethod === "DELETE" &&
                /^\/products\/[^/]+\/hard$/.test(path):
                return hardDeleteProduct(pathParameters.id);

            default:
                return response(404, {
                    success: false,
                    message: "Route not found",
                });
        }
    } catch (err) {
        console.error(err);

        return response(500, {
            success: false,
            message: err.message,
        });
    }
};

function response(statusCode, body) {
    return {
        statusCode,
        body: JSON.stringify(body),
    };
}

//==========================================================
// GET ALL
//==========================================================

async function getProducts() {
    const data = await docClient.send(
        new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "isDeleted <> :deleted",
            ExpressionAttributeValues: {
                ":deleted": true,
            },
        })
    );

    return response(200, data.Items);
}

//==========================================================
// GET BY ID
//==========================================================

async function getProduct(id) {
    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                productId: id,
            },
        })
    );

    if (!data.Item || data.Item.isDeleted) {
        return response(404, {
            success: false,
            message: "Product not found",
        });
    }

    return response(200, data.Item);
}

//==========================================================
// CREATE
//==========================================================

async function createProduct(body) {

    const product = JSON.parse(body);

    product.productId = crypto.randomUUID();
    product.createdAt = new Date().toISOString();
    product.updatedAt = product.createdAt;
    product.isDeleted = false;

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: product,
        })
    );

    return response(201, {
        success: true,
        product,
    });
}

//==========================================================
// PUT
//==========================================================

async function replaceProduct(id, body) {

    const product = JSON.parse(body);

    product.productId = id;
    product.updatedAt = new Date().toISOString();

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: product,
        })
    );

    return response(200, {
        success: true,
        message: "Product replaced",
    });
}

//==========================================================
// PATCH
//==========================================================

async function updateProduct(id, body) {

    const updates = JSON.parse(body);

    let updateExp = [];
    let values = {};
    let names = {};

    Object.keys(updates).forEach((key) => {
        updateExp.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = updates[key];
    });

    updateExp.push("#updatedAt = :updatedAt");

    names["#updatedAt"] = "updatedAt";
    values[":updatedAt"] = new Date().toISOString();

    await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                productId: id,
            },
            UpdateExpression: `SET ${updateExp.join(", ")}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
        })
    );

    return response(200, {
        success: true,
        message: "Product updated",
    });
}

//==========================================================
// SOFT DELETE
//==========================================================

async function softDeleteProduct(id) {

    await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                productId: id,
            },
            UpdateExpression: "SET isDeleted = :d",
            ExpressionAttributeValues: {
                ":d": true,
            },
        })
    );

    return response(200, {
        success: true,
        message: "Product deleted",
    });
}

//==========================================================
// HARD DELETE
//==========================================================

async function hardDeleteProduct(id) {

    await docClient.send(
        new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                productId: id,
            },
        })
    );

    return response(200, {
        success: true,
        message: "Product permanently deleted",
    });
}
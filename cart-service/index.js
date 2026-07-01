const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.CARTS_TABLE_NAME || "CartsTable";

exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, body } = event;

    try {

        // Health Check
        if (httpMethod === "GET" && path === "/health") {
            return response(200, {
                success: true,
                message: "Cart Service Running",
            });
        }

        // Get Cart
        if (httpMethod === "GET" && pathParameters?.userId) {
            return await getCart(pathParameters.userId);
        }

        // Add Item
        if (httpMethod === "POST" && pathParameters?.userId) {
            return await addItem(pathParameters.userId, body);
        }

        // Replace Entire Cart
        if (httpMethod === "PUT" && pathParameters?.userId) {
            return await replaceCart(pathParameters.userId, body);
        }

        // Update Quantity
        if (
            httpMethod === "PATCH" &&
            pathParameters?.userId &&
            pathParameters?.productId
        ) {
            return await updateQuantity(
                pathParameters.userId,
                pathParameters.productId,
                body
            );
        }

        // Remove Item
        if (
            httpMethod === "DELETE" &&
            pathParameters?.userId &&
            pathParameters?.productId
        ) {
            return await removeItem(
                pathParameters.userId,
                pathParameters.productId
            );
        }

        // Clear Cart
        if (
            httpMethod === "DELETE" &&
            pathParameters?.userId &&
            !pathParameters?.productId
        ) {
            return await clearCart(pathParameters.userId);
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

// ======================================
// GET CART
// ======================================

async function getCart(userId) {

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId },
        })
    );

    return response(
        200,
        data.Item || {
            userId,
            items: [],
        }
    );
}

// ======================================
// ADD ITEM
// ======================================

async function addItem(userId, body) {

    const { productId, quantity } = JSON.parse(body);

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId },
        })
    );

    const cart = data.Item || {
        userId,
        items: [],
    };

    const item = cart.items.find(
        (i) => i.productId === productId
    );

    if (item) {
        item.quantity += quantity;
    } else {
        cart.items.push({
            productId,
            quantity,
        });
    }

    await saveCart(cart);

    return response(200, {
        success: true,
        message: "Item added to cart",
        data: cart,
    });
}

// ======================================
// REPLACE CART
// ======================================

async function replaceCart(userId, body) {

    const cart = JSON.parse(body);

    cart.userId = userId;

    await saveCart(cart);

    return response(200, {
        success: true,
        message: "Cart replaced",
        data: cart,
    });
}

// ======================================
// UPDATE QUANTITY
// ======================================

async function updateQuantity(userId, productId, body) {

    const { quantity } = JSON.parse(body);

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId },
        })
    );

    if (!data.Item)
        return response(404, {
            success: false,
            message: "Cart not found",
        });

    const cart = data.Item;

    const item = cart.items.find(
        (i) => i.productId === productId
    );

    if (!item)
        return response(404, {
            success: false,
            message: "Product not in cart",
        });

    item.quantity = quantity;

    await saveCart(cart);

    return response(200, {
        success: true,
        message: "Quantity updated",
        data: cart,
    });
}

// ======================================
// REMOVE ITEM
// ======================================

async function removeItem(userId, productId) {

    const data = await docClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId },
        })
    );

    if (!data.Item)
        return response(404, {
            success: false,
            message: "Cart not found",
        });

    const cart = data.Item;

    cart.items = cart.items.filter(
        (i) => i.productId !== productId
    );

    await saveCart(cart);

    return response(200, {
        success: true,
        message: "Item removed",
        data: cart,
    });
}

// ======================================
// CLEAR CART
// ======================================

async function clearCart(userId) {

    const cart = {
        userId,
        items: [],
    };

    await saveCart(cart);

    return response(200, {
        success: true,
        message: "Cart cleared",
    });
}

// ======================================
// SAVE CART
// ======================================

async function saveCart(cart) {

    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: cart,
        })
    );
}

// ======================================
// RESPONSE
// ======================================

function response(statusCode, body) {

    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}
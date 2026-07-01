# Serverless E-Commerce Microservices

## Overview

This project implements a **serverless e-commerce application** using
**AWS Lambda**, **Amazon API Gateway**, and **Amazon DynamoDB**. Each
microservice is deployed independently and owns its own DynamoDB table,
following the database-per-service pattern.

## Architecture

``` text
                  Client / Frontend
                         │
                         ▼
                    API Gateway
                         │
    ┌──────────┬──────────┬──────────┬──────────┐
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
  Product    Cart      Order     Payment   Inventory
  Service    Service   Service   Service   Service
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
  Products   Carts     Orders    Payments  Inventory
  Table      Table     Table      Table      Table
```

## Services

### Product Service

Responsible for managing the product catalog.

  Method   Endpoint
  -------- ------------------
  GET      `/products`
  GET      `/products/{id}`
  POST     `/products`
  PUT      `/products/{id}`
  PATCH    `/products/{id}`
  DELETE   `/products/{id}`
  GET      `/health`

**Table:** `ProductsTable`

------------------------------------------------------------------------

### Inventory Service

Responsible for inventory and stock management.

  Method   Endpoint
  -------- --------------------------------
  POST     `/inventory`
  GET      `/inventory/{productId}`
  PUT      `/inventory/{productId}`
  PATCH    `/inventory/{productId}/stock`
  DELETE   `/inventory/{productId}`
  GET      `/health`

**Table:** `InventoryTable`

------------------------------------------------------------------------

### Cart Service

Responsible for user shopping carts.

  Method   Endpoint
  -------- ------------------------------------
  GET      `/carts/{userId}`
  POST     `/carts/{userId}`
  PUT      `/carts/{userId}`
  PATCH    `/carts/{userId}/item/{productId}`
  DELETE   `/carts/{userId}/item/{productId}`
  DELETE   `/carts/{userId}`
  GET      `/health`

**Table:** `CartsTable`

------------------------------------------------------------------------

### Order Service

Responsible for order management.

  Method   Endpoint
  -------- ----------------------------------------------------------
  POST     `/orders`
  GET      `/orders/{id}`
  PUT      `/orders/{id}`
  PATCH    `/orders/{id}/status`
  DELETE   `/orders/{id}`
  GET      `/users/{userId}/orders` *(requires `userId-index` GSI)*
  GET      `/health`

**Table:** `OrdersTable`

Typical order lifecycle:

    PENDING
       ↓
    CONFIRMED
       ↓
    SHIPPED
       ↓
    DELIVERED

or

    PENDING
       ↓
    CANCELLED

------------------------------------------------------------------------

### Payment Service

Responsible for payment processing.

  Method   Endpoint
  -------- ---------------------------------------------------------------
  POST     `/payments`
  GET      `/payments/{id}`
  PUT      `/payments/{id}`
  PATCH    `/payments/{id}/status`
  DELETE   `/payments/{id}`
  GET      `/orders/{orderId}/payments` *(requires `orderId-index` GSI)*
  GET      `/health`

**Table:** `PaymentsTable`

Typical payment status:

-   PENDING
-   SUCCESS
-   FAILED
-   REFUNDED

------------------------------------------------------------------------

## End-to-End Workflow

1.  Admin creates a product using **Product Service**.
2.  Admin creates the corresponding inventory record using **Inventory
    Service**.
3.  Customer browses products.
4.  Customer adds products to their cart.
5.  Customer reviews the cart.
6.  Customer places an order.
7.  Customer completes payment.
8.  Order status is updated after successful payment.
9.  Inventory stock is reduced based on purchased quantity.
10. Order progresses through fulfillment until delivery.

## Service Responsibilities

-   **Product Service** -- Product catalog management.
-   **Inventory Service** -- Stock management.
-   **Cart Service** -- User shopping carts.
-   **Order Service** -- Order creation and lifecycle.
-   **Payment Service** -- Payment processing and tracking.

Each service: - Is deployed as an independent AWS Lambda. - Owns its own
DynamoDB table. - Can be deployed, scaled, and updated independently.

## Future Improvements

-   AWS Step Functions for workflow orchestration.
-   Amazon EventBridge or SNS/SQS for event-driven communication.
-   JWT authentication and authorization.
-   Input validation using Zod.
-   CloudWatch logging and monitoring.
-   CI/CD using GitHub Actions.
-   Integration with Stripe or Razorpay for real payment processing.
-   Distributed tracing with AWS X-Ray.

// Файл за демонстриране на сложни заявки с агрегация в MongoDB

const { MongoClient } = require("mongodb");
require("dotenv").config();

// Настройки за връзка с MongoDB
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function demonstrateAdvancedQueries() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Успешно свързване с MongoDB");

    const db = client.db(dbName);
    const partsCollection = db.collection("parts");
    const customersCollection = db.collection("customers");
    const ordersCollection = db.collection("orders");

    console.log("===== СЛОЖНИ ЗАЯВКИ С АГРЕГАЦИЯ =====");

    // 1. Агрегация за намиране на най-продавани части
    console.log("\n----- ЗАЯВКА 1: Най-продавани части -----");

    const topSellingParts = await ordersCollection
      .aggregate([
        // Разгъване на масива с поръчани артикули
        { $unwind: "$items" },
        // Групиране по номер на част и сумиране на количества
        {
          $group: {
            _id: "$items.partNumber",
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: [
                  "$items.quantity",
                  {
                    $subtract: [
                      "$items.priceAtPurchase",
                      {
                        $multiply: [
                          "$items.priceAtPurchase",
                          { $divide: ["$items.discount", 100] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        // Сортиране по най-продавани
        { $sort: { totalSold: -1 } },
        // Лимитиране до топ 5
        { $limit: 5 },
        // Свързване с колекцията parts за получаване на информация за частта
        {
          $lookup: {
            from: "parts",
            localField: "_id",
            foreignField: "partNumber",
            as: "partInfo",
          },
        },
        // Разгъване на масива с информация за частта (ще съдържа 1 елемент)
        { $unwind: "$partInfo" },
        // Избиране и преименуване на полета за резултата
        {
          $project: {
            _id: 0,
            partNumber: "$_id",
            name: "$partInfo.name",
            manufacturer: "$partInfo.manufacturer",
            category: "$partInfo.category",
            totalSold: 1,
            totalRevenue: { $round: ["$totalRevenue", 2] },
          },
        },
      ])
      .toArray();

    console.log("Топ 5 най-продавани авточасти:");
    console.log(JSON.stringify(topSellingParts, null, 2));

    // 2. Агрегация за анализ на продажбите по месеци и категории
    console.log(
      "\n----- ЗАЯВКА 2: Анализ на продажбите по месеци и категории -----"
    );

    const monthlySalesByCategory = await ordersCollection
      .aggregate([
        // Разгъване на масива с поръчани артикули
        { $unwind: "$items" },
        // Свързване с колекцията parts за получаване на категория
        {
          $lookup: {
            from: "parts",
            localField: "items.partNumber",
            foreignField: "partNumber",
            as: "partDetails",
          },
        },
        // Разгъване на масива с информация за частта
        { $unwind: "$partDetails" },
        // Създаване на поле за година-месец
        {
          $addFields: {
            yearMonth: {
              $dateToString: {
                format: "%Y-%m",
                date: { $dateFromString: { dateString: "$orderDate" } },
              },
            },
          },
        },
        // Групиране по година-месец и категория
        {
          $group: {
            _id: {
              yearMonth: "$yearMonth",
              category: "$partDetails.category",
            },
            totalSales: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: [
                  "$items.quantity",
                  {
                    $subtract: [
                      "$items.priceAtPurchase",
                      {
                        $multiply: [
                          "$items.priceAtPurchase",
                          { $divide: ["$items.discount", 100] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        // Сортиране по година-месец и след това по категория
        {
          $sort: {
            "_id.yearMonth": 1,
            "_id.category": 1,
          },
        },
        // Избиране и преименуване на полета за резултата
        {
          $project: {
            _id: 0,
            yearMonth: "$_id.yearMonth",
            category: "$_id.category",
            totalSales: 1,
            totalRevenue: { $round: ["$totalRevenue", 2] },
          },
        },
      ])
      .toArray();

    console.log("Анализ на продажбите по месеци и категории:");
    console.log(JSON.stringify(monthlySalesByCategory, null, 2));

    // 3. Агрегация за обобщение на клиенти по градове и изчисляване на средна стойност на поръчките
    console.log("\n----- ЗАЯВКА 3: Обобщение на клиенти по градове -----");

    const customersByCity = await customersCollection
      .aggregate([
        // Групиране по град
        {
          $group: {
            _id: "$address.city",
            customerCount: { $sum: 1 },
            averageLoyaltyPoints: { $avg: "$loyaltyPoints" },
            retailers: {
              $sum: { $cond: [{ $eq: ["$customerType", "retail"] }, 1, 0] },
            },
            wholesalers: {
              $sum: { $cond: [{ $eq: ["$customerType", "wholesale"] }, 1, 0] },
            },
          },
        },
        // Сортиране по брой клиенти (намаляващо)
        { $sort: { customerCount: -1 } },
        // Избиране и преименуване на полета за резултата
        {
          $project: {
            _id: 0,
            city: "$_id",
            customerCount: 1,
            averageLoyaltyPoints: { $round: ["$averageLoyaltyPoints", 0] },
            retailers: 1,
            wholesalers: 1,
          },
        },
      ])
      .toArray();

    console.log("Обобщение на клиенти по градове:");
    console.log(JSON.stringify(customersByCity, null, 2));

    // 4. Комбиниране на данни от клиенти и поръчки и намиране на най-активните клиенти
    console.log("\n----- ЗАЯВКА 4: Най-активни клиенти с поръчки -----");

    const topCustomers = await customersCollection
      .aggregate([
        // Търсене на съвпадения в orders колекцията
        {
          $lookup: {
            from: "orders",
            localField: "customerId",
            foreignField: "customerId",
            as: "customerOrders",
          },
        },
        // Добавяне на изчислени полета
        {
          $addFields: {
            totalOrders: { $size: "$customerOrders" },
            totalSpent: {
              $sum: "$customerOrders.payment.amount",
            },
          },
        },
        // Филтриране само на клиенти с поръчки
        {
          $match: {
            totalOrders: { $gt: 0 },
          },
        },
        // Сортиране по общата сума (намаляващо)
        {
          $sort: {
            totalSpent: -1,
          },
        },
        // Лимитиране до топ 5
        {
          $limit: 5,
        },
        // Избиране на полета за резултата
        {
          $project: {
            _id: 0,
            customerId: 1,
            name: {
              $cond: {
                if: { $eq: ["$customerType", "retail"] },
                then: { $concat: ["$firstName", " ", "$lastName"] },
                else: "$companyName",
              },
            },
            city: "$address.city",
            customerType: 1,
            loyaltyPoints: 1,
            totalOrders: 1,
            totalSpent: { $round: ["$totalSpent", 2] },
          },
        },
      ])
      .toArray();

    console.log("Топ 5 най-активни клиенти:");
    console.log(JSON.stringify(topCustomers, null, 2));

    // 5. Намиране на най-печеливши категории части
    console.log(
      "\n----- ЗАЯВКА 5: Анализ на най-печеливши категории части -----"
    );

    const mostProfitableCategories = await partsCollection
      .aggregate([
        // Групиране по категория
        {
          $group: {
            _id: "$category",
            partCount: { $sum: 1 },
            averagePrice: { $avg: "$price" },
            totalInventoryValue: {
              $sum: { $multiply: ["$price", "$stockQuantity"] },
            },
          },
        },
        // Сортиране по стойност на наличности (намаляващо)
        {
          $sort: {
            totalInventoryValue: -1,
          },
        },
        // Избиране и преименуване на полета за резултата
        {
          $project: {
            _id: 0,
            category: "$_id",
            partCount: 1,
            averagePrice: { $round: ["$averagePrice", 2] },
            totalInventoryValue: { $round: ["$totalInventoryValue", 2] },
          },
        },
      ])
      .toArray();

    console.log("Анализ на най-печеливши категории части:");
    console.log(JSON.stringify(mostProfitableCategories, null, 2));

    console.log("\nВсички сложни заявки бяха демонстрирани успешно!");
  } catch (err) {
    console.error("Грешка при изпълнение на сложни заявки:", err);
  } finally {
    await client.close();
    console.log("Връзката с MongoDB е затворена.");
  }
}

// Изпълнение на демонстрацията на сложни заявки
demonstrateAdvancedQueries().catch(console.error);

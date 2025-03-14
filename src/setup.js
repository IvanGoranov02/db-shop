// Файл за настройка и инициализация на базата данни за магазин за авточасти

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Настройки за връзка с MongoDB
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Функция за зареждане на JSON файл
function loadJSON(filename) {
  const filePath = path.join(__dirname, "..", "data", filename);
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

async function setupDatabase() {
  const client = new MongoClient(uri);

  try {
    // Свързване с MongoDB
    await client.connect();
    console.log("Успешно свързване с MongoDB");

    const db = client.db(dbName);

    // Създаване на колекции
    console.log("Създаване на колекции...");

    // 1. Колекция за части
    const partsCollection = db.collection("parts");
    // Зареждане на данни за части
    const partsData = loadJSON("parts.json");

    // Изчистване на съществуващите данни
    await partsCollection.deleteMany({});

    // Вмъкване на новите данни
    const partsResult = await partsCollection.insertMany(partsData);
    console.log(`${partsResult.insertedCount} части бяха успешно добавени.`);

    // Създаване на индекси за колекцията parts
    await partsCollection.createIndex({ partNumber: 1 }, { unique: true });
    await partsCollection.createIndex({ category: 1 });
    await partsCollection.createIndex({ manufacturer: 1 });
    await partsCollection.createIndex({ compatibleCars: 1 });
    console.log("Индексите за колекцията parts бяха създадени.");

    // 2. Колекция за клиенти
    const customersCollection = db.collection("customers");
    // Зареждане на данни за клиенти
    const customersData = loadJSON("customers.json");

    // Изчистване на съществуващите данни
    await customersCollection.deleteMany({});

    // Вмъкване на новите данни
    const customersResult = await customersCollection.insertMany(customersData);
    console.log(
      `${customersResult.insertedCount} клиенти бяха успешно добавени.`
    );

    // Създаване на индекси за колекцията customers
    await customersCollection.createIndex({ customerId: 1 }, { unique: true });
    await customersCollection.createIndex({ email: 1 }, { unique: true });
    await customersCollection.createIndex({ customerType: 1 });
    await customersCollection.createIndex({ "address.city": 1 });
    console.log("Индексите за колекцията customers бяха създадени.");

    // 3. Колекция за поръчки
    const ordersCollection = db.collection("orders");
    // Зареждане на данни за поръчки
    const ordersData = loadJSON("orders.json");

    // Изчистване на съществуващите данни
    await ordersCollection.deleteMany({});

    // Вмъкване на новите данни
    const ordersResult = await ordersCollection.insertMany(ordersData);
    console.log(`${ordersResult.insertedCount} поръчки бяха успешно добавени.`);

    // Създаване на индекси за колекцията orders
    await ordersCollection.createIndex({ orderId: 1 }, { unique: true });
    await ordersCollection.createIndex({ customerId: 1 });
    await ordersCollection.createIndex({ orderDate: 1 });
    await ordersCollection.createIndex({ status: 1 });
    await ordersCollection.createIndex({ "items.partNumber": 1 });
    console.log("Индексите за колекцията orders бяха създадени.");

    console.log("Настройката на базата данни е завършена успешно!");
  } catch (err) {
    console.error("Грешка при настройката на базата данни:", err);
  } finally {
    // Затваряне на връзката с MongoDB
    await client.close();
    console.log("Връзката с MongoDB е затворена.");
  }
}

// Изпълнение на настройката
setupDatabase().catch(console.error);

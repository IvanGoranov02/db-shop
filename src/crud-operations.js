// Файл за демонстриране на CRUD операции върху MongoDB база данни

const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

// Настройки за връзка с MongoDB
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function demonstrateCRUD() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Успешно свързване с MongoDB");

    const db = client.db(dbName);
    const partsCollection = db.collection("parts");
    const customersCollection = db.collection("customers");
    const ordersCollection = db.collection("orders");

    console.log("===== ДЕМОНСТРАЦИЯ НА CRUD ОПЕРАЦИИ =====");

    // CREATE (Създаване) операции
    console.log("\n----- CREATE ОПЕРАЦИИ -----");

    // 1. Добавяне на нова авточаст
    const newPart = {
      partNumber: "FIL-003",
      name: "Филтър за купе",
      category: "Филтри",
      manufacturer: "Bosch",
      price: 18.5,
      compatibleCars: ["BMW", "Mercedes", "Audi", "VW"],
      stockQuantity: 25,
      location: "A1-14",
      specifications: {
        size: "240mm x 190mm",
        filterType: "Въглероден",
        material: "Активен въглен",
      },
    };

    const partInsertResult = await partsCollection.insertOne(newPart);
    console.log(
      `Нова авточаст беше добавена с ID: ${partInsertResult.insertedId}`
    );
    console.log(`Добавена част: ${JSON.stringify(newPart, null, 2)}`);

    // 2. Добавяне на нов клиент
    const newCustomer = {
      customerId: "C011",
      firstName: "Александър",
      lastName: "Попов",
      email: "alex.popov@example.com",
      phone: "0898123456",
      address: {
        street: "ул. Марица 56",
        city: "Пловдив",
        postalCode: "4000",
        country: "България",
      },
      registrationDate: new Date().toISOString().split("T")[0],
      loyaltyPoints: 0,
      customerType: "retail",
      carDetails: [
        {
          make: "Ford",
          model: "Focus",
          year: 2021,
          vin: "1FADP3F23HL123456",
        },
      ],
    };

    const customerInsertResult = await customersCollection.insertOne(
      newCustomer
    );
    console.log(
      `Нов клиент беше добавен с ID: ${customerInsertResult.insertedId}`
    );

    // 3. Създаване на нова поръчка
    const newOrder = {
      orderId: "ORD-011",
      customerId: "C011",
      orderDate: new Date().toISOString(),
      status: "Processing",
      items: [
        {
          partNumber: "FIL-003",
          quantity: 1,
          priceAtPurchase: 18.5,
          discount: 0,
        },
      ],
      shipping: {
        method: "Standard",
        cost: 5.0,
        trackingNumber: "",
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      payment: {
        method: "CreditCard",
        transactionId: "TXN-NEW",
        amount: 23.5,
        status: "Paid",
      },
    };

    const orderInsertResult = await ordersCollection.insertOne(newOrder);
    console.log(
      `Нова поръчка беше добавена с ID: ${orderInsertResult.insertedId}`
    );

    // READ (Четене) операции
    console.log("\n----- READ ОПЕРАЦИИ -----");

    // 1. Намиране на част по номер (точно съвпадение)
    const foundPart = await partsCollection.findOne({ partNumber: "FIL-001" });
    console.log(
      `Част намерена по номер: ${JSON.stringify(foundPart, null, 2)}`
    );

    // 2. Намиране на части по категория и цена над определена стойност
    const expensiveParts = await partsCollection
      .find({
        category: "Спирачна система",
        price: { $gte: 70 },
      })
      .toArray();
    console.log(
      `Намерени ${expensiveParts.length} спирачни части с цена над 70 лв.`
    );

    // 3. Търсене на части, съвместими с определена марка автомобил
    const bmwParts = await partsCollection
      .find({
        compatibleCars: { $in: ["BMW"] },
      })
      .toArray();
    console.log(`Намерени ${bmwParts.length} части, съвместими с BMW`);

    // 4. Търсене с регулярен израз за име на част
    const filterParts = await partsCollection
      .find({
        name: { $regex: "филтър", $options: "i" },
      })
      .toArray();
    console.log(
      `Намерени ${filterParts.length} части, съдържащи "филтър" в името`
    );

    // 5. Сортиране на части по цена (възходящо)
    const sortedParts = await partsCollection
      .find()
      .sort({ price: 1 })
      .limit(5)
      .toArray();
    console.log(
      `Първите 5 най-евтини части: ${JSON.stringify(
        sortedParts.map((p) => ({ name: p.name, price: p.price })),
        null,
        2
      )}`
    );

    // UPDATE (Актуализиране) операции
    console.log("\n----- UPDATE ОПЕРАЦИИ -----");

    // 1. Актуализиране на цена на една част
    const priceUpdateResult = await partsCollection.updateOne(
      { partNumber: "FIL-003" },
      { $set: { price: 19.99 } }
    );
    console.log(
      `Актуализирана цена на част: ${priceUpdateResult.modifiedCount} запис(a) променени`
    );

    // 2. Увеличаване на лоялни точки на клиент
    const loyaltyUpdateResult = await customersCollection.updateOne(
      { customerId: "C011" },
      { $inc: { loyaltyPoints: 20 } }
    );
    console.log(
      `Актуализирани лоялни точки: ${loyaltyUpdateResult.modifiedCount} запис(a) променени`
    );

    // 3. Актуализиране на състояние на поръчка и добавяне на проследяващ номер
    const orderUpdateResult = await ordersCollection.updateOne(
      { orderId: "ORD-011" },
      {
        $set: {
          status: "Shipped",
          "shipping.trackingNumber": "BG7890123456",
        },
      }
    );
    console.log(
      `Актуализирана поръчка: ${orderUpdateResult.modifiedCount} запис(a) променени`
    );

    // 4. Актуализиране на всички части от определен производител с увеличение на цената с 5%
    const multipleUpdateResult = await partsCollection.updateMany(
      { manufacturer: "Bosch" },
      { $mul: { price: 1.05 } }
    );
    console.log(
      `Актуализирани цени на Bosch части: ${multipleUpdateResult.modifiedCount} запис(a) променени`
    );

    // 5. Добавяне на съвместим автомобил към съществуваща част
    const compatibilityUpdateResult = await partsCollection.updateOne(
      { partNumber: "FIL-003" },
      { $push: { compatibleCars: "Skoda" } }
    );
    console.log(
      `Добавена съвместимост: ${compatibilityUpdateResult.modifiedCount} запис(a) променени`
    );

    // DELETE (Изтриване) операции
    console.log("\n----- DELETE ОПЕРАЦИИ -----");

    // 1. Изтриване на една част
    const deleteOneResult = await partsCollection.deleteOne({
      partNumber: "FIL-003",
    });
    console.log(
      `Изтрита част: ${deleteOneResult.deletedCount} запис(a) изтрити`
    );

    // 2. Изтриване на няколко части на веднъж (ако са с количество 0)
    const zeroStockParts = await partsCollection
      .find({ stockQuantity: 0 })
      .toArray();
    if (zeroStockParts.length > 0) {
      const deleteZeroStockResult = await partsCollection.deleteMany({
        stockQuantity: 0,
      });
      console.log(
        `Изтрити части с нулево количество: ${deleteZeroStockResult.deletedCount} запис(a) изтрити`
      );
    } else {
      console.log(
        "Няма части с нулево количество за изтриване - ще създадем тестова част"
      );
      const testPart = {
        partNumber: "TEST-DELETE",
        name: "Тестова част за изтриване",
        stockQuantity: 0,
      };
      await partsCollection.insertOne(testPart);
      const deleteTestResult = await partsCollection.deleteMany({
        stockQuantity: 0,
      });
      console.log(
        `Изтрити тестови части: ${deleteTestResult.deletedCount} запис(a) изтрити`
      );
    }

    // 3. Изтриване на поръчка
    const deleteOrderResult = await ordersCollection.deleteOne({
      orderId: "ORD-011",
    });
    console.log(
      `Изтрита поръчка: ${deleteOrderResult.deletedCount} запис(a) изтрити`
    );

    // 4. Изтриване на клиент
    const deleteCustomerResult = await customersCollection.deleteOne({
      customerId: "C011",
    });
    console.log(
      `Изтрит клиент: ${deleteCustomerResult.deletedCount} запис(a) изтрити`
    );

    console.log("\nВсички CRUD операции бяха демонстрирани успешно!");
  } catch (err) {
    console.error("Грешка при изпълнение на CRUD операции:", err);
  } finally {
    await client.close();
    console.log("Връзката с MongoDB е затворена.");
  }
}

// Изпълнение на демонстрацията на CRUD операции
demonstrateCRUD().catch(console.error);

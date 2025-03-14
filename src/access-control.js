// Файл за демонстриране на ролево-базиран контрол на достъпа в MongoDB

const { MongoClient } = require("mongodb");
require("dotenv").config();

// Настройки за връзка с MongoDB
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Основни роли за системата
const ROLES = {
  ADMIN: "admin", // Пълен достъп
  MANAGER: "manager", // Може да чете всичко и да редактира данни за части и поръчки
  SALES: "sales", // Може да чете всичко и да създава/редактира поръчки
  INVENTORY: "inventory", // Може да управлява складовите наличности
  READONLY: "readonly", // Може само да чете (справки)
};

// Функция за създаване на потребители и роли
async function setupAccessControl() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Успешно свързване с MongoDB");

    const db = client.db(dbName);

    console.log("\n===== ДЕМОНСТРАЦИЯ НА КОНТРОЛ НА ДОСТЪПА (RBAC) =====");

    // 1. Управление на потребители в MongoDB
    console.log("\n----- 1. Създаване на потребители в MongoDB -----");

    // За нуждите на демонстрацията, ще използваме db.command()
    // В реална ситуация, това би се изпълнило чрез mongo shell или Atlas UI

    // Тази операция би изисквала admin привилегии, така че
    // ще симулираме създаването на потребители за демонстрационни цели

    console.log("Симулиране на създаване на потребители в MongoDB:");
    const users = [
      {
        name: "admin_user",
        role: ROLES.ADMIN,
        description: "Администратор с пълен достъп",
      },
      {
        name: "manager_user",
        role: ROLES.MANAGER,
        description: "Мениджър, управляващ частите и поръчките",
      },
      {
        name: "sales_user",
        role: ROLES.SALES,
        description: "Търговец, обработващ поръчки",
      },
      {
        name: "inventory_user",
        role: ROLES.INVENTORY,
        description: "Отговорник за склада",
      },
      {
        name: "reports_user",
        role: ROLES.READONLY,
        description: "Потребител само за справки",
      },
    ];

    users.forEach((user) => {
      console.log(`Създаден потребител: ${user.name} (${user.description})`);
    });

    // 2. Конфигуриране на роли
    console.log("\n----- 2. Конфигуриране на роли -----");

    const roles = {
      [ROLES.ADMIN]: {
        description: "Администратор с пълен достъп",
        permissions: {
          parts: { read: true, write: true, delete: true },
          customers: { read: true, write: true, delete: true },
          orders: { read: true, write: true, delete: true },
        },
      },
      [ROLES.MANAGER]: {
        description: "Мениджър на магазина",
        permissions: {
          parts: { read: true, write: true, delete: false },
          customers: { read: true, write: false, delete: false },
          orders: { read: true, write: true, delete: false },
        },
      },
      [ROLES.SALES]: {
        description: "Търговец",
        permissions: {
          parts: { read: true, write: false, delete: false },
          customers: { read: true, write: true, delete: false },
          orders: { read: true, write: true, delete: false },
        },
      },
      [ROLES.INVENTORY]: {
        description: "Отговорник за склада",
        permissions: {
          parts: { read: true, write: true, delete: false },
          customers: { read: false, write: false, delete: false },
          orders: { read: true, write: false, delete: false },
        },
      },
      [ROLES.READONLY]: {
        description: "Потребител само за справки",
        permissions: {
          parts: { read: true, write: false, delete: false },
          customers: { read: true, write: false, delete: false },
          orders: { read: true, write: false, delete: false },
        },
      },
    };

    // Създаване на колекция за роли
    try {
      await db.createCollection("roles");
      console.log('Създадена колекция "roles"');
    } catch (e) {
      console.log('Колекцията "roles" вече съществува');
    }

    // Изтриване на съществуващите роли
    await db.collection("roles").deleteMany({});

    // Добавяне на новите роли
    const roleInsertResult = await db.collection("roles").insertMany(
      Object.entries(roles).map(([roleName, roleData]) => ({
        name: roleName,
        ...roleData,
      }))
    );

    console.log(`Създадени ${roleInsertResult.insertedCount} роли`);

    // Извеждане на информация за конфигурираните роли
    console.log("\nКонфигурирани роли и права:");
    const configuredRoles = await db.collection("roles").find().toArray();
    configuredRoles.forEach((role) => {
      console.log(`Роля: ${role.name} (${role.description})`);
      console.log("  Права:");
      Object.entries(role.permissions).forEach(([collection, permissions]) => {
        console.log(
          `    ${collection}: ${Object.entries(permissions)
            .map(([op, allowed]) => `${op}:${allowed ? "да" : "не"}`)
            .join(", ")}`
        );
      });
    });

    // 3. Симулиране на достъп според ролите
    console.log("\n----- 3. Симулиране на достъп според ролите -----");

    // Функция за проверка на достъп
    async function checkAccess(username, collection, operation) {
      const user = users.find((u) => u.name === username);
      if (!user) {
        return { hasAccess: false, reason: "Непознат потребител" };
      }

      const role = await db.collection("roles").findOne({ name: user.role });
      if (!role) {
        return { hasAccess: false, reason: "Непозната роля" };
      }

      const hasAccess = role.permissions[collection]?.[operation] === true;
      return {
        hasAccess,
        reason: hasAccess ? "Достъпът е разрешен" : "Достъпът е отказан",
      };
    }

    // Симулиране на операции с различни потребители и проверка на достъпа
    const accessTests = [
      {
        username: "admin_user",
        collection: "parts",
        operation: "delete",
        description: "Изтриване на част от администратор",
      },
      {
        username: "manager_user",
        collection: "parts",
        operation: "write",
        description: "Редактиране на част от мениджър",
      },
      {
        username: "manager_user",
        collection: "parts",
        operation: "delete",
        description: "Опит за изтриване на част от мениджър",
      },
      {
        username: "sales_user",
        collection: "customers",
        operation: "write",
        description: "Редактиране на клиент от търговец",
      },
      {
        username: "sales_user",
        collection: "parts",
        operation: "write",
        description: "Опит за редактиране на част от търговец",
      },
      {
        username: "inventory_user",
        collection: "parts",
        operation: "write",
        description: "Актуализиране на наличност от отговорник за склада",
      },
      {
        username: "inventory_user",
        collection: "customers",
        operation: "read",
        description: "Опит за четене на клиент от отговорник за склада",
      },
      {
        username: "reports_user",
        collection: "orders",
        operation: "read",
        description: "Преглед на поръчка от потребител за справки",
      },
      {
        username: "reports_user",
        collection: "orders",
        operation: "write",
        description: "Опит за редактиране на поръчка от потребител за справки",
      },
    ];

    for (const test of accessTests) {
      const result = await checkAccess(
        test.username,
        test.collection,
        test.operation
      );
      console.log(
        `${test.description}: ${result.hasAccess ? "РАЗРЕШЕН" : "ОТКАЗАН"} - ${
          result.reason
        }`
      );
    }

    // 4. Създаване на представително ограничение (collection-level)
    console.log(
      "\n----- 4. Пример за ограничения на документи (Row-Level Security) -----"
    );

    // Симулиране на колекция с ограничения по потребител
    // Например, търговец може да вижда само поръчките, които е обработил
    // В реален MongoDB, това би изисквало използване на MongoDB Atlas или Enterprise

    // Създаване на нова колекция с поръчки, които имат информация за обработилия ги търговец
    try {
      await db.createCollection("salesOrdersWithAccess");
      console.log('Създадена колекция "salesOrdersWithAccess"');

      // Изтриване на съществуващите данни
      await db.collection("salesOrdersWithAccess").deleteMany({});

      // Добавяне на примерни поръчки с информация за обработилия ги търговец
      const sampleOrders = [
        {
          orderId: "SO-001",
          customerId: "C001",
          amount: 150.5,
          status: "Completed",
          createdBy: "sales_user1",
        },
        {
          orderId: "SO-002",
          customerId: "C002",
          amount: 285.75,
          status: "Completed",
          createdBy: "sales_user2",
        },
        {
          orderId: "SO-003",
          customerId: "C003",
          amount: 99.9,
          status: "Pending",
          createdBy: "sales_user1",
        },
      ];

      await db.collection("salesOrdersWithAccess").insertMany(sampleOrders);
      console.log(
        `Добавени ${sampleOrders.length} примерни поръчки с информация за търговец`
      );

      // Симулиране на достъп до поръчки според търговеца
      console.log("\nСимулиране на Row-Level Security:");

      // Търговец 1 вижда само своите поръчки
      const sales_user1Orders = await db
        .collection("salesOrdersWithAccess")
        .find({ createdBy: "sales_user1" })
        .toArray();

      console.log(
        `Търговец 1 вижда ${
          sales_user1Orders.length
        } поръчки: ${sales_user1Orders.map((o) => o.orderId).join(", ")}`
      );

      // Търговец 2 вижда само своите поръчки
      const sales_user2Orders = await db
        .collection("salesOrdersWithAccess")
        .find({ createdBy: "sales_user2" })
        .toArray();

      console.log(
        `Търговец 2 вижда ${
          sales_user2Orders.length
        } поръчки: ${sales_user2Orders.map((o) => o.orderId).join(", ")}`
      );

      // Администратор вижда всички поръчки
      const adminOrders = await db
        .collection("salesOrdersWithAccess")
        .find({})
        .toArray();

      console.log(
        `Администраторът вижда ${adminOrders.length} поръчки: ${adminOrders
          .map((o) => o.orderId)
          .join(", ")}`
      );
    } catch (e) {
      console.error("Грешка при демонстрацията на Row-Level Security:", e);
    }

    console.log(
      "\nДемонстрацията на контрол на достъпа беше завършена успешно!"
    );
  } catch (err) {
    console.error("Грешка при демонстрацията на контрол на достъпа:", err);
  } finally {
    await client.close();
    console.log("Връзката с MongoDB е затворена.");
  }
}

// Изпълнение на демонстрацията
setupAccessControl().catch(console.error);

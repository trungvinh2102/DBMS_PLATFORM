import prisma from "../src/index";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  console.log("Seeding...");

  // 1. Roles & Permissions
  console.log("Seeding Roles & Permissions...");

  const rolesData = [
    { name: "Admin", description: "Full system access" },
    { name: "Creator", description: "Can create and manage resources" },
    { name: "Viewer", description: "Can view shared resources" },
    { name: "Default", description: "Basic access" },
  ];

  for (const role of rolesData) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  // Assign basic permissions (Simplified)
  // In a real app, we'd have a mapping of Role -> Permissions.
  // For now, ensuring Roles exist is the priority.

  // 2. Create Admin User
  const adminEmail = "admin@dbms.local"; // Using .local to avoid confusion with real emails
  const adminPassword = "password123"; // Strong password in prod!

  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });

  if (adminRole) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        roleId: adminRole.id,
        username: "admin",
      },
      create: {
        email: adminEmail,
        username: "admin",
        name: "System Admin",
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });
    console.log(adminUser);
    console.log(
      `Admin user seeded: username: admin / email: ${adminEmail} / password: ${adminPassword}`,
    );
  }

  // 3. Existing Data Cleanup (Optional - can be commented out if persistence is desired)
  // console.log("Cleaning up Dbs...");
  // await prisma.queryHistory.deleteMany({});
  // await prisma.savedQuery.deleteMany({});
  // await prisma.db.deleteMany({});

  // 4. Add Local Database if not exists
  const existingLocalDetails = await prisma.db.findFirst({
    where: { databaseName: "dbms_platform" },
  });

  // Replicate simple encryption from api utils to avoid circular deps
  function encrypt(text: string): string {
    const secret =
      process.env.JWT_SECRET || "fallback-secret-key-must-be-secure";
    const key = crypto.scryptSync(secret, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  if (!existingLocalDetails) {
    await prisma.db.create({
      data: {
        databaseName: "dbms_platform",
        type: "postgres",
        config: {
          host: "localhost",
          port: 5432,
          user: "postgres",
          password: encrypt("postgres"),
          database: "dbms_platform",
        },
      },
    });
    console.log("Created Local Database connection");
  }

  console.log("Seeding completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

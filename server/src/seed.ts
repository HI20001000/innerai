import { prisma } from './prismaClient.js';
import { hashPassword } from './utils/auth.js';

const run = async () => {
  const passwordHash = await hashPassword('password123');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash, name: 'Admin User', role: 'admin' },
  });

  const customer = await prisma.customer.upsert({
    where: { name: 'Acme Corp' },
    update: {},
    create: { name: 'Acme Corp' },
  });

  const manufacturer = await prisma.manufacturer.upsert({
    where: { name: 'Contoso Manufacturing' },
    update: {},
    create: { name: 'Contoso Manufacturing' },
  });

  const manufacturer2 = await prisma.manufacturer.upsert({
    where: { name: 'Fabrikam Industries' },
    update: {},
    create: { name: 'Fabrikam Industries' },
  });

  const product = await prisma.product.upsert({
    where: { manufacturerId_name: { manufacturerId: manufacturer.id, name: 'Contoso Widget' } },
    update: {},
    create: { manufacturerId: manufacturer.id, name: 'Contoso Widget' },
  });

  await prisma.product.upsert({
    where: { manufacturerId_name: { manufacturerId: manufacturer2.id, name: 'Fabrikam Gear' } },
    update: {},
    create: { manufacturerId: manufacturer2.id, name: 'Fabrikam Gear' },
  });

  const meeting = await prisma.meeting.create({
    data: {
      title: 'Kickoff with Acme',
      content: 'Discussed project scope and timelines for new deployment.',
      occurredAt: new Date(),
      customerId: customer.id,
      manufacturerId: manufacturer.id,
      productId: product.id,
      createdByUserId: 1,
    },
  });

  await prisma.followUp.create({
    data: {
      meetingId: meeting.id,
      title: 'Share project timeline',
      description: 'Send initial project plan to Acme stakeholders',
      status: 'TODO',
      suggestedOwnerName: 'PM Team',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completed');
};

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

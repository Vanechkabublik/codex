import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/environment.validation';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { Actor } from '../common/decorators/auth.decorators';
import { User } from '../modules/users/entities/user.entity';
import { Role, REVIEWER_ROLES } from '../modules/users/role.enum';
import { Offer } from '../modules/offers/entities/offer.entity';
import {
  OfferStatus,
  OfferType,
  ReviewDecision,
} from '../modules/offers/offer.enums';
import { OffersService } from '../modules/offers/offers.service';
import { WorkflowService } from '../modules/approvals/workflow.service';
export const DEMO_PASSWORD = 'DemoPass123!';
export const DEMO_USERS: readonly { email: string; role: Role }[] = [
  { email: 'owner@demo.local', role: Role.OFFER_OWNER },
  { email: 'product@demo.local', role: Role.PRODUCT_MANAGER },
  { email: 'analyst@demo.local', role: Role.ANALYST },
  { email: 'operations@demo.local', role: Role.OPERATIONS_MANAGER },
  { email: 'client@demo.local', role: Role.CLIENT },
  { email: 'admin@demo.local', role: Role.ADMIN },
];
export async function seedDemo(
  app: INestApplicationContext,
  includeOffers = true,
): Promise<Map<Role, Actor>> {
  const db = app.get(DataSource);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const runner = db.createQueryRunner();
  await runner.connect();
  await runner.query("SELECT pg_advisory_lock(hashtext('cashback-demo-seed'))");
  try {
    const users = new Map<Role, Actor>();
    for (const demo of DEMO_USERS) {
      let user = await db.getRepository(User).findOneBy({ email: demo.email });
      if (!user) {
        const passwordHash = await argon2.hash(
          config.get('SEED_DEMO_PASSWORD', DEMO_PASSWORD, { infer: true }),
          { type: argon2.argon2id },
        );
        user = await db
          .getRepository(User)
          .save(db.getRepository(User).create({ ...demo, passwordHash }));
      }
      if (user.role !== demo.role)
        throw new Error(
          'Demo user exists with a different role; seed does not overwrite users',
        );
      users.set(user.role, { id: user.id, email: user.email, role: user.role });
    }
    if (includeOffers) await seedOffers(app, users);
    return users;
  } finally {
    await runner.query(
      "SELECT pg_advisory_unlock(hashtext('cashback-demo-seed'))",
    );
    await runner.release();
  }
}
async function seedOffers(
  app: INestApplicationContext,
  users: Map<Role, Actor>,
): Promise<void> {
  const db = app.get(DataSource);
  const offers = app.get(OffersService);
  const workflow = app.get(WorkflowService);
  const owner = users.get(Role.OFFER_OWNER);
  if (!owner) throw new Error('Missing demo owner');
  const examples = [
    { title: 'Demo: draft', status: OfferStatus.DRAFT },
    { title: 'Demo: under review', status: OfferStatus.UNDER_REVIEW },
    { title: 'Demo: requested changes', status: OfferStatus.CHANGES_REQUESTED },
    {
      title: 'Demo: partially approved',
      status: OfferStatus.PARTIALLY_APPROVED,
    },
    { title: 'Demo: approved awaiting launch', status: OfferStatus.APPROVED },
    { title: 'Demo: rejected', status: OfferStatus.REJECTED },
    ...Array.from({ length: 7 }, (_, index) => ({
      title: 'Demo: cashback ' + (index + 1).toString(),
      status: OfferStatus.READY_TO_LAUNCH,
    })),
  ];
  for (const [index, example] of examples.entries()) {
    if (
      await db
        .getRepository(Offer)
        .existsBy({ title: example.title, ownerId: owner.id })
    )
      continue;
    const offer = await offers.create(
      {
        title: example.title,
        category: index % 2 ? 'Restaurants' : 'Groceries',
        type: index % 2 ? OfferType.INTERNAL : OfferType.PARTNER,
        cashbackPercent: (5 + index).toString(),
        startsAt: new Date(Date.now() - 86400000).toISOString(),
        endsAt: new Date(Date.now() + (60 + index) * 86400000).toISOString(),
        payoutLimit: '100000.00',
        mccCodes: index % 2 ? ['5812', '5814'] : ['5411', '5499'],
        clientDescription: 'Demo elevated cashback offer',
      },
      owner,
    );
    if (example.status === OfferStatus.DRAFT) continue;
    const submitted = await workflow.submit(offer.id, owner);
    if (example.status === OfferStatus.UNDER_REVIEW) continue;
    for (const role of REVIEWER_ROLES) {
      const reviewer = users.get(role);
      if (!reviewer) throw new Error('Missing demo reviewer');
      const decision =
        example.status === OfferStatus.REJECTED
          ? ReviewDecision.REJECTED
          : example.status === OfferStatus.CHANGES_REQUESTED
            ? ReviewDecision.CHANGES_REQUESTED
            : ReviewDecision.APPROVED;
      await workflow.review(
        offer.id,
        submitted.round.id,
        { decision, comment: 'Demo decision: ' + decision },
        reviewer,
      );
      if (
        [
          OfferStatus.REJECTED,
          OfferStatus.CHANGES_REQUESTED,
          OfferStatus.PARTIALLY_APPROVED,
        ].includes(example.status)
      )
        break;
    }
    if (example.status === OfferStatus.READY_TO_LAUNCH)
      await workflow.ready(offer.id, owner);
  }
}

import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/** Maps frontend PascalCase entity names to Prisma client delegates */
const ENTITY_DELEGATES = {
  PCARecord: 'pcaRecord',
  PCFCashCount: 'pcfCashCount',
  PCFDisbursement: 'pcfDisbursement',
  SiteOffice: 'siteOffice',
  Classification: 'classification',
  Category: 'category',
  Comment: 'comment',
  ActivityLog: 'activityLog',
  Notification: 'notification',
  AuditSchedule: 'auditSchedule',
  Finding: 'finding',
};

function getDelegate(entityName) {
  const key = ENTITY_DELEGATES[entityName];
  if (!key || !prisma[key]) return null;
  return prisma[key];
}

function serialize(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.created_date instanceof Date) {
    out.created_date = out.created_date.toISOString();
  }
  if (out.updated_date instanceof Date) {
    out.updated_date = out.updated_date.toISOString();
  }
  return out;
}

function serializeMany(rows) {
  return rows.map(serialize);
}

function parseSort(sortParam) {
  if (!sortParam) return { created_date: 'desc' };
  const desc = sortParam.startsWith('-');
  const field = desc ? sortParam.slice(1) : sortParam;
  return { [field]: desc ? 'desc' : 'asc' };
}

function parseLimit(limitParam) {
  if (limitParam == null || limitParam === '') return undefined;
  const n = parseInt(limitParam, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildWhere(query) {
  const where = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'sort' || key === 'limit') continue;
    if (value === 'true') where[key] = true;
    else if (value === 'false') where[key] = false;
    else if (value !== '' && value != null) where[key] = value;
  }
  return where;
}

/** GET /api/entities/:entityName — list with optional sort and limit */
router.get('/:entityName', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entityName);
    if (!delegate) return res.status(404).json({ error: 'Entity not found' });

    const orderBy = parseSort(req.query.sort);
    const take = parseLimit(req.query.limit);

    const rows = await delegate.findMany({
      orderBy,
      ...(take ? { take } : {}),
    });

    res.json(serializeMany(rows));
  } catch (err) {
    next(err);
  }
});

/** GET /api/entities/:entityName/filter — filter with query params, sort, limit */
router.get('/:entityName/filter', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entityName);
    if (!delegate) return res.status(404).json({ error: 'Entity not found' });

    const where = buildWhere(req.query);
    const orderBy = parseSort(req.query.sort);
    const take = parseLimit(req.query.limit);

    const rows = await delegate.findMany({
      where,
      orderBy,
      ...(take ? { take } : {}),
    });

    res.json(serializeMany(rows));
  } catch (err) {
    next(err);
  }
});

/** POST /api/entities/:entityName — create */
router.post('/:entityName', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entityName);
    if (!delegate) return res.status(404).json({ error: 'Entity not found' });

    const row = await delegate.create({ data: req.body });
    res.status(201).json(serialize(row));
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/entities/:entityName/:id — update */
router.patch('/:entityName/:id', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entityName);
    if (!delegate) return res.status(404).json({ error: 'Entity not found' });

    const row = await delegate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(serialize(row));
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    next(err);
  }
});

/** DELETE /api/entities/:entityName/:id — delete */
router.delete('/:entityName/:id', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entityName);
    if (!delegate) return res.status(404).json({ error: 'Entity not found' });

    await delegate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    next(err);
  }
});

export default router;

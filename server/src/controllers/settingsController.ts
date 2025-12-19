import { Request, Response } from 'express';
import { prisma } from '../prismaClient.js';
import { z } from 'zod';

const customerSchema = z.object({ name: z.string().min(1) });
const manufacturerSchema = z.object({ name: z.string().min(1) });
const productSchema = z.object({ name: z.string().min(1), manufacturerId: z.number().int() });

export const listCustomers = async (_req: Request, res: Response) => {
  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  res.json(customers);
};

export const createCustomer = async (req: Request, res: Response) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const customer = await prisma.customer.create({ data: parsed.data });
  res.status(201).json(customer);
};

export const updateCustomer = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
  res.json(customer);
};

export const deleteCustomer = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.customer.delete({ where: { id } });
  res.status(204).send();
};

export const listManufacturers = async (_req: Request, res: Response) => {
  const manufacturers = await prisma.manufacturer.findMany({ orderBy: { name: 'asc' } });
  res.json(manufacturers);
};

export const createManufacturer = async (req: Request, res: Response) => {
  const parsed = manufacturerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const manufacturer = await prisma.manufacturer.create({ data: parsed.data });
  res.status(201).json(manufacturer);
};

export const updateManufacturer = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = manufacturerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const manufacturer = await prisma.manufacturer.update({ where: { id }, data: parsed.data });
  res.json(manufacturer);
};

export const deleteManufacturer = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.manufacturer.delete({ where: { id } });
  res.status(204).send();
};

export const listProducts = async (req: Request, res: Response) => {
  const manufacturerId = req.query.manufacturerId ? Number(req.query.manufacturerId) : undefined;
  const products = await prisma.product.findMany({
    where: manufacturerId ? { manufacturerId } : undefined,
    orderBy: { name: 'asc' },
  });
  res.json(products);
};

export const createProduct = async (req: Request, res: Response) => {
  const parsed = productSchema.safeParse({
    name: req.body.name,
    manufacturerId: Number(req.body.manufacturerId),
  });
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const product = await prisma.product.create({ data: parsed.data });
  res.status(201).json(product);
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = productSchema.safeParse({
    name: req.body.name,
    manufacturerId: Number(req.body.manufacturerId),
  });
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const product = await prisma.product.update({ where: { id }, data: parsed.data });
  res.json(product);
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.product.delete({ where: { id } });
  res.status(204).send();
};

import { Client } from 'pg';

export default async () => {
  const client = new Client({
    user: 'postgres',
    password: 'parol',
    host: '192.168.56.1',
    port: '5432',
    database: 'demo',
  });

  await client.connect();
  return client;
};
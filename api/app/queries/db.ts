import { Pool, QueryConfig, QueryResult } from "pg";
import { getConfig } from "../../config/config";

const { postgres } = getConfig();

const max = process.env.POSTGRES_POOL_MAX
  ? parseInt(process.env.POSTGRES_POOL_MAX, 10)
  : 10;

export const pool = new Pool({ ...postgres, max });

export const query = <T = any>(
  text: string | QueryConfig,
  values?: any[]
): Promise<QueryResult<T>> => {
  if (typeof text === "string") return pool.query<T>(text, values);
  return pool.query<T>(text);
};

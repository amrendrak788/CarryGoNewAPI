const { pool } = require("../database/postgres");

class PostgresBaseModel {

   constructor(tableName, options = {}) {

    this.tableName = tableName;

    this.hasSoftDelete =
        options.hasSoftDelete ?? true;
}

   async all() {

    const query = this.hasSoftDelete
        ? `
            SELECT *
            FROM ${this.tableName}
            WHERE is_deleted = FALSE
               OR is_deleted IS NULL
          `
        : `
            SELECT *
            FROM ${this.tableName}
          `;

    const result =
        await pool.query(query);

    return result.rows;
}

    async allWithDeleted() {

        const result = await pool.query(
            `SELECT * FROM ${this.tableName}`
        );

        return result.rows;
    }

   async count() {

    const query = this.hasSoftDelete
        ? `
            SELECT COUNT(*)::int AS count
            FROM ${this.tableName}
            WHERE is_deleted = FALSE
               OR is_deleted IS NULL
          `
        : `
            SELECT COUNT(*)::int AS count
            FROM ${this.tableName}
          `;

    const result =
        await pool.query(query);

    return result.rows[0].count;
}

   async findById(id) {

    const query = this.hasSoftDelete
        ? `
            SELECT *
            FROM ${this.tableName}
            WHERE id = $1
              AND (
                    is_deleted = FALSE
                    OR is_deleted IS NULL
              )
            LIMIT 1
          `
        : `
            SELECT *
            FROM ${this.tableName}
            WHERE id = $1
            LIMIT 1
          `;

    const result =
        await pool.query(
            query,
            [id]
        );

    return result.rows[0] || null;
}

  async findOneByColumn(column, value) {

    const query = this.hasSoftDelete
        ? `
            SELECT *
            FROM ${this.tableName}
            WHERE ${column} = $1
              AND (
                    is_deleted = FALSE
                    OR is_deleted IS NULL
              )
            LIMIT 1
          `
        : `
            SELECT *
            FROM ${this.tableName}
            WHERE ${column} = $1
            LIMIT 1
          `;

    const result =
        await pool.query(
            query,
            [value]
        );

    return result.rows[0] || null;
}

    async findManyByColumn(column, value) {

    const query = this.hasSoftDelete
        ? `
            SELECT *
            FROM ${this.tableName}
            WHERE ${column} = $1
              AND (
                    is_deleted = FALSE
                    OR is_deleted IS NULL
              )
          `
        : `
            SELECT *
            FROM ${this.tableName}
            WHERE ${column} = $1
          `;

    const result =
        await pool.query(
            query,
            [value]
        );

    return result.rows;
}

    async create(columns, values) {

        const placeholders =
            values.map((_, index) => `$${index + 1}`).join(", ");

        const result = await pool.query(
            `
            INSERT INTO ${this.tableName}
            (${columns.join(", ")})
            VALUES (${placeholders})
            RETURNING *
            `,
            values
        );

        return result.rows[0];
    }

    async updateById(id, patch) {

        const entries = Object.entries(patch);

        if (entries.length === 0) {
            return this.findById(id);
        }

        const setClause = entries
            .map(([column], index) =>
                `${column} = $${index + 1}`
            )
            .join(", ");

        const values = entries.map(
            ([, value]) => value
        );

        values.push(id);

        const result = await pool.query(
            `
            UPDATE ${this.tableName}
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING *
            `,
            values
        );

        return result.rows[0] || null;
    }

    async softDelete(id) {

        const result = await pool.query(
            `
            UPDATE ${this.tableName}
            SET
                is_deleted = TRUE,
                deleted_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return result.rows[0] || null;
    }

    async restore(id) {

        const result = await pool.query(
            `
            UPDATE ${this.tableName}
            SET
                is_deleted = FALSE,
                deleted_at = NULL
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return result.rows[0] || null;
    }
    async withTransaction(callback) {
    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const result =
            await callback(client);

        await client.query("COMMIT");

        return result;

    } catch (err) {

        await client.query("ROLLBACK");

        throw err;

    } finally {

        client.release();

    }
}
}

module.exports = PostgresBaseModel;
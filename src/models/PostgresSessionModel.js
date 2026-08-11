const { pool } = require("../database/postgres");

class PostgresSessionModel {

    // -----------------------------------------
    // Find session by token
    // -----------------------------------------
    async findByToken(token) {

        const result = await pool.query(
            `
            SELECT
                id,
                token,
                user_id AS "userId",
                created_at AS "createdAt"
            FROM sessions
            WHERE token = $1
            LIMIT 1
            `,
            [token]
        );

        return result.rows[0] || null;
    }


    // -----------------------------------------
    // Find all sessions of a user
    // -----------------------------------------
    async findByUserId(userId) {

        const result = await pool.query(
            `
            SELECT
                id,
                token,
                user_id AS "userId",
                created_at AS "createdAt"
            FROM sessions
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId]
        );

        return result.rows;
    }


    // -----------------------------------------
    // Create session
    //
    // Existing JSON behavior:
    // Remove user's old sessions first.
    // -----------------------------------------
    async createSession(session) {

        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            // Remove all old sessions of this user
            await client.query(
                `
                DELETE FROM sessions
                WHERE user_id = $1
                `,
                [session.userId]
            );

            // Create new session
            const result = await client.query(
                `
                INSERT INTO sessions
                (
                    id,
                    token,
                    user_id,
                    created_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4
                )
                RETURNING
                    id,
                    token,
                    user_id AS "userId",
                    created_at AS "createdAt"
                `,
                [
                    session.id,
                    session.token,
                    session.userId,
                    session.createdAt
                ]
            );

            await client.query("COMMIT");

            return result.rows[0];

        } catch (err) {

            await client.query("ROLLBACK");

            throw err;

        } finally {

            client.release();

        }
    }


    // -----------------------------------------
    // Delete session by token
    // -----------------------------------------
    async deleteByToken(token) {

        await pool.query(
            `
            DELETE FROM sessions
            WHERE token = $1
            `,
            [token]
        );

        return true;
    }


    // -----------------------------------------
    // Delete all sessions of user
    // -----------------------------------------
    async deleteByUserId(userId) {

        await pool.query(
            `
            DELETE FROM sessions
            WHERE user_id = $1
            `,
            [userId]
        );

        return true;
    }
}

module.exports = new PostgresSessionModel();
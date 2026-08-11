const { pool } = require("../database/postgres");

class PostgresUserModel {

    async findByMobile(mobile) {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                mobile,
                password,
                selected_role AS "selectedRole",
                city,
                last_login AS "lastLogin",
                updated_at AS "updatedAt"
            FROM users
            WHERE mobile = $1
            LIMIT 1
            `,
            [mobile]
        );

        return result.rows[0] || null;
    }


    async existsByMobile(mobile) {

        const result = await pool.query(
            `
            SELECT 1
            FROM users
            WHERE mobile = $1
            LIMIT 1
            `,
            [mobile]
        );

        return result.rowCount > 0;
    }


    async create(user) {

        const result = await pool.query(
            `
            INSERT INTO users
            (
                id,
                name,
                mobile,
                password,
                selected_role,
                city,
                updated_at
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                NOW()
            )
            RETURNING
                id,
                name,
                mobile,
                password,
                selected_role AS "selectedRole",
                city,
                last_login AS "lastLogin",
                updated_at AS "updatedAt"
            `,
            [
                user.id,
                user.name,
                user.mobile,
                user.password,
                user.selectedRole || null,
                user.city || "Delhi"
            ]
        );

        return result.rows[0];
    }


    async update(id, patch) {

        const allowedColumns = {
            name: "name",
            mobile: "mobile",
            password: "password",
            selectedRole: "selected_role",
            city: "city",
            lastLogin: "last_login",
            updatedAt: "updated_at"
        };

        const entries = Object.entries(patch)
            .filter(([key]) => allowedColumns[key]);

        if (entries.length === 0) {
            return this.findById(id);
        }

        const setParts = [];
        const values = [];

        entries.forEach(([key, value], index) => {

            setParts.push(
                `${allowedColumns[key]} = $${index + 1}`
            );

            values.push(value);
        });

        values.push(id);

        const result = await pool.query(
            `
            UPDATE users
            SET ${setParts.join(", ")}
            WHERE id = $${values.length}
            RETURNING
                id,
                name,
                mobile,
                password,
                selected_role AS "selectedRole",
                city,
                last_login AS "lastLogin",
                updated_at AS "updatedAt"
            `,
            values
        );

        return result.rows[0] || null;
    }


    async findById(id) {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                mobile,
                password,
                selected_role AS "selectedRole",
                city,
                last_login AS "lastLogin",
                updated_at AS "updatedAt"
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [id]
        );

        return result.rows[0] || null;
    }


   async updateLastLogin(id) {

    const currentTime = new Date();

    return this.update(id, {

        lastLogin: currentTime,

        updatedAt: currentTime

    });
}
}


module.exports = new PostgresUserModel();
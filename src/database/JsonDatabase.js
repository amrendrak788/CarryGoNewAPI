const fs = require("fs");
const path = require("path");
const { seedData } = require("./seedData");

class JsonDatabase {

    constructor(filePath) {

        this.filePath = filePath;

        this.transactionDepth = 0;
        this.transactionData = null;

        this.ensureDatabase();
    }

    ensureDatabase() {

        const dir = path.dirname(this.filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(this.filePath)) {
            this.write(seedData);
        }
    }

    read() {

        this.ensureDatabase();

        /*
         * During transaction:
         * return the in-memory transaction data.
         */
        if (this.transactionDepth > 0) {
            return this.transactionData;
        }

        return JSON.parse(
            fs.readFileSync(
                this.filePath,
                "utf8"
            )
        );
    }

    write(data) {

        /*
         * During transaction:
         * do NOT write to disk yet.
         *
         * All model changes stay in memory
         * until transaction commits.
         */
        if (this.transactionDepth > 0) {

            this.transactionData = data;

            return;
        }

        this.atomicWrite(data);
    }

    atomicWrite(data) {

        const tempFile =
            `${this.filePath}.tmp`;

        const json =
            JSON.stringify(
                data,
                null,
                2
            );

        /*
         * Write complete JSON to temporary file first.
         */
        fs.writeFileSync(
            tempFile,
            json,
            "utf8"
        );

        /*
         * Replace the real database file
         * only after the temporary file is
         * completely written.
         */
        fs.renameSync(
            tempFile,
            this.filePath
        );
    }

    transaction(callback) {

        /*
         * Support nested transactions.
         */
        const isOuterTransaction =
            this.transactionDepth === 0;

        if (isOuterTransaction) {

            /*
             * Create an independent snapshot.
             * If transaction fails, original data
             * remains untouched.
             */
            this.transactionData =
                JSON.parse(
                    JSON.stringify(
                        this.read()
                    )
                );
        }

        this.transactionDepth++;

        try {

            const result = callback(
                this.transactionData
            );

            this.transactionDepth--;

            /*
             * Only outermost transaction commits.
             */
            if (isOuterTransaction) {

                this.atomicWrite(
                    this.transactionData
                );

                this.transactionData = null;
            }

            return result;

        } catch (error) {

            this.transactionDepth--;

            /*
             * Rollback only at outermost level.
             */
            if (isOuterTransaction) {
                this.transactionData = null;
            }

            throw error;
        }
    }

    reset() {

        this.write(seedData);

        return this.read();
    }
}

module.exports = {
    JsonDatabase
};
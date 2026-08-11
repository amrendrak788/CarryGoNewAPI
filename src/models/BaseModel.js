const { db } = require("../database/db");

class BaseModel {

    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    read() {
        return db.read();
    }

    write(data) {
        db.write(data);
    }

  collection() {

    const data = this.read();

    if (!Array.isArray(data[this.collectionName])) {
        data[this.collectionName] = [];
        this.write(data);
    }

    return data[this.collectionName];
}

    all() {
        return this.collection().filter(item => !item.isDeleted);
    }

    allWithDeleted() {
        return this.collection();
    }

    count() {
        return this.all().length;
    }

    findById(id) {
        return this.collection().find(
            item => item.id === id && !item.isDeleted
        ) || null;
    }

    findOne(predicate) {
        return this.all().find(predicate) || null;
    }

    find(predicate) {
        return this.all().filter(predicate);
    }

    exists(predicate) {
        return this.all().some(predicate);
    }

    create(record) {

        const data = this.read();
        if (!Array.isArray(data[this.collectionName])) {
                data[this.collectionName] = [];
            }
        data[this.collectionName].push(record);

        this.write(data);

        return record;
    }

    update(id, patch) {

        const data = this.read();

        const item = data[this.collectionName].find(
            row => row.id === id
        );

        if (!item)
            return null;

        Object.assign(item, patch);

        data[this.collectionName] =
            data[this.collectionName].map(row =>
                row.id === id ? item : row
            );

        this.write(data);

        return item;
    }

    softDelete(id) {

        return this.update(id, {

            isDeleted: true,

            deletedAt: new Date().toISOString()

        });

    }

    restore(id) {

        return this.update(id, {

            isDeleted: false,

            deletedAt: null

        });

    }

    paginate(page = 1, limit = 10) {

        page = Number(page);

        limit = Number(limit);

        const rows = this.all();

        const start = (page - 1) * limit;

        return {

            total: rows.length,

            page,

            limit,

            totalPages: Math.ceil(rows.length / limit),

            data: rows.slice(start, start + limit)

        };

    }

    search(keyword, fields = []) {

        keyword = String(keyword).toLowerCase();

        return this.all().filter(item =>

            fields.some(field =>

                String(item[field] || "")
                    .toLowerCase()
                    .includes(keyword)

            )

        );

    }

    sort(field, order = "asc") {

        const rows = [...this.all()];

        rows.sort((a, b) => {

            if (a[field] < b[field])
                return order === "asc" ? -1 : 1;

            if (a[field] > b[field])
                return order === "asc" ? 1 : -1;

            return 0;

        });

        return rows;

    }

}

module.exports = BaseModel;
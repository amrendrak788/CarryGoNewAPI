const BaseModel = require("./BaseModel");

class UserModel extends BaseModel {

    constructor() {
        super("users");
    }

    findByMobile(mobile) {

        return this.findOne(user =>
            user.mobile === mobile
        );

    }

    findByEmail(email) {

        return this.findOne(user =>
            user.email === email
        );

    }

    existsByMobile(mobile) {

        return this.exists(user =>
            user.mobile === mobile
        );

    }

    existsByEmail(email) {

        return this.exists(user =>
            user.email === email
        );

    }

    changePassword(id, password) {

        return this.update(id, {

            password,

            updatedAt: new Date().toISOString()

        });

    }

    updateLastLogin(id) {

        return this.update(id, {

            lastLogin: new Date().toISOString(),

            updatedAt: new Date().toISOString()

        });

    }

    block(id) {

        return this.update(id, {

            isBlocked: true,

            updatedAt: new Date().toISOString()

        });

    }

    unblock(id) {

        return this.update(id, {

            isBlocked: false,

            updatedAt: new Date().toISOString()

        });

    }

}

module.exports = new UserModel();
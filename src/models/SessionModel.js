const BaseModel = require("./BaseModel");

class SessionModel extends BaseModel {

    constructor() {
        super("sessions");
    }

    findByToken(token) {

        return this.findOne(session =>
            session.token === token
        );

    }

    findByUserId(userId) {

        return this.find(session =>
            session.userId === userId
        );

    }

    createSession(session) {

        const data = this.read();

        // Ek user ki purani sessions remove
        data.sessions = data.sessions.filter(
            item => item.userId !== session.userId
        );

        data.sessions.push(session);

        this.write(data);

        return session;

    }

    deleteByToken(token) {

        const data = this.read();

        data.sessions = data.sessions.filter(
            session => session.token !== token
        );

        this.write(data);

        return true;
    }

    deleteByUserId(userId) {

        const data = this.read();

        data.sessions = data.sessions.filter(
            session => session.userId !== userId
        );

        this.write(data);

        return true;
    }

}

module.exports = new SessionModel();